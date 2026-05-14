"""Pub/sub in-memory pour Server-Sent Events.

Chaque utilisateur peut ouvrir une connexion SSE via /api/sync/events ; toute
mutation (upload, delete, rename) émet un évènement dans la queue de cet
utilisateur, qui le reçoit en temps réel sur tous ses appareils connectés.

Limitation : la mémoire n'est pas partagée entre workers gunicorn. Si on
scale à plusieurs workers ou plusieurs instances, il faut basculer sur
Redis pub/sub.
"""
import json
import queue
from collections import defaultdict
from threading import Lock


class SyncHub:
    def __init__(self):
        self._subscribers = defaultdict(list)  # user_id -> [Queue]
        self._lock = Lock()

    def subscribe(self, user_id: str) -> queue.Queue:
        q = queue.Queue(maxsize=100)
        with self._lock:
            self._subscribers[user_id].append(q)
        return q

    def unsubscribe(self, user_id: str, q: queue.Queue):
        with self._lock:
            if q in self._subscribers[user_id]:
                self._subscribers[user_id].remove(q)
            if not self._subscribers[user_id]:
                del self._subscribers[user_id]

    def publish(self, user_id: str, event_type: str, data: dict):
        if not user_id:
            return
        payload = json.dumps({'type': event_type, 'data': data})
        with self._lock:
            subs = list(self._subscribers.get(user_id, []))
        for q in subs:
            try:
                q.put_nowait(payload)
            except queue.Full:
                # client trop lent, on drop pour ne pas bloquer les autres
                pass


hub = SyncHub()
