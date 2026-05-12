import os
import logging

logger = logging.getLogger(__name__)


class ClamAVError(Exception):
    pass


def _get_client():
    import clamd
    host = os.getenv('CLAMAV_HOST', 'clamav')
    port = int(os.getenv('CLAMAV_PORT', '3310'))
    return clamd.ClamdNetworkSocket(host=host, port=port, timeout=30)


def is_enabled():
    return os.getenv('CLAMAV_ENABLED', 'true').lower() != 'false'


def scan_file(path):
    """
    Scan le fichier `path` et retourne (clean: bool, reason: str|None).
    Lève ClamAVError si le scan ne peut pas être effectué (fail-closed côté appelant).
    Utilise instream pour streamer le contenu — pas besoin que ClamAV partage le filesystem.
    """
    if not is_enabled():
        return True, None

    try:
        client = _get_client()
        with open(path, 'rb') as f:
            result = client.instream(f)
    except Exception as e:
        logger.error('ClamAV scan failed for %s: %s', path, e)
        raise ClamAVError(f'ClamAV unreachable: {e}')

    if not result:
        return True, None

    # instream renvoie {'stream': ('OK', None)} ou {'stream': ('FOUND', 'Sig.Name')}
    status, signature = result.get('stream', (None, None))
    if status == 'OK':
        return True, None
    if status == 'FOUND':
        logger.warning('Malware detected in %s: %s', path, signature)
        return False, signature
    raise ClamAVError(f'Unexpected ClamAV status: {status}')
