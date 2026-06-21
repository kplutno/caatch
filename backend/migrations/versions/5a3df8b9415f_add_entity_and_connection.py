"""add entity and connection

Revision ID: 5a3df8b9415f
Revises: 03782b6512eb
Create Date: 2026-06-20 13:20:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "5a3df8b9415f"
down_revision: Union[str, Sequence[str], None] = "03782b6512eb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if database is postgres and create enum type
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        # Check if type exists first using pg_type to prevent DuplicateObjectError
        has_type = bind.execute(
            sa.text("SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entitytype')")
        ).scalar()
        if not has_type:
            op.execute(
                "CREATE TYPE entitytype AS ENUM ('person', 'event', 'place', 'organization', 'other')"
            )

    op.create_table(
        "entity",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),  # type: ignore[attr-defined]
        sa.Column(
            "type",
            postgresql.ENUM(
                "person",
                "event",
                "place",
                "organization",
                "other",
                name="entitytype",
                inherit_schema=True,
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("description", sqlmodel.sql.sqltypes.AutoString(), nullable=True),  # type: ignore[attr-defined]
        sa.Column(
            "properties", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_entity_name"), "entity", ["name"], unique=False)
    op.create_index(op.f("ix_entity_type"), "entity", ["type"], unique=False)

    op.create_table(
        "connection",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("source_id", sa.UUID(), nullable=False),
        sa.Column("target_id", sa.UUID(), nullable=False),
        sa.Column("label", sqlmodel.sql.sqltypes.AutoString(), nullable=False),  # type: ignore[attr-defined]
        sa.Column("description", sqlmodel.sql.sqltypes.AutoString(), nullable=True),  # type: ignore[attr-defined]
        sa.Column(
            "properties", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["source_id"],
            ["entity.id"],
        ),
        sa.ForeignKeyConstraint(
            ["target_id"],
            ["entity.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_connection_source_id"), "connection", ["source_id"], unique=False
    )
    op.create_index(
        op.f("ix_connection_target_id"), "connection", ["target_id"], unique=False
    )
    op.create_index(op.f("ix_connection_label"), "connection", ["label"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_connection_label"), table_name="connection")
    op.drop_index(op.f("ix_connection_target_id"), table_name="connection")
    op.drop_index(op.f("ix_connection_source_id"), table_name="connection")
    op.drop_table("connection")
    op.drop_index(op.f("ix_entity_type"), table_name="entity")
    op.drop_index(op.f("ix_entity_name"), table_name="entity")
    op.drop_table("entity")

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        sa.Enum(name="entitytype").drop(bind, checkfirst=True)
