"""Create lecture_study_materials table

Revision ID: 09f3076243f9
Revises: fbe4a1cc6146
Create Date: 2026-10-18 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '09f3076243f9'
down_revision: Union[str, Sequence[str], None] = 'fbe4a1cc6146'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    insp = sa.inspect(conn)
    if 'lecture_study_materials' not in insp.get_table_names():
        op.create_table(
            'lecture_study_materials',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('lecture_id', sa.UUID(), nullable=False),
            sa.Column('summary', sa.Text(), nullable=True),
            sa.Column('revision_notes', sa.Text(), nullable=True),
            sa.Column('source_language', sa.String(length=20), nullable=False, server_default='en'),
            sa.Column('generation_status', sa.String(length=20), nullable=False, server_default='completed'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['lecture_id'], ['lectures.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(
            op.f('ix_lecture_study_materials_lecture_id'),
            'lecture_study_materials',
            ['lecture_id'],
            unique=True,
        )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_lecture_study_materials_lecture_id'), table_name='lecture_study_materials')
    op.drop_table('lecture_study_materials')
