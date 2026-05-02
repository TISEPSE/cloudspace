"""add sidebar_hover to user_settings

Revision ID: 001_add_sidebar_hover
Revises:
Create Date: 2026-04-17

"""
from alembic import op
import sqlalchemy as sa

revision = '001_add_sidebar_hover'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    result = bind.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name='user_settings' AND column_name='sidebar_hover'"
    ))
    if not result.fetchone():
        op.add_column('user_settings', sa.Column('sidebar_hover', sa.Boolean(), nullable=False, server_default='false'))


def downgrade():
    op.drop_column('user_settings', 'sidebar_hover')
