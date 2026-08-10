"""
Registro de corridas del pipeline en SQLite.

Implementa el DB_PATH declarado en config.py. Cada ejecución de
run_analysis.py genera una fila en la tabla `corridas` con metadatos
de la corrida: timestamp, carpeta de salida, archivos procesados, errores.

Uso:
    from src.run_tracker import RunTracker
    tracker = RunTracker()
    run_id = tracker.iniciar_corrida(output_folder, n_archivos)
    tracker.finalizar_corrida(run_id, n_ok, n_err, score_promedio)
"""

import sqlite3
import logging
from datetime import datetime
from pathlib import Path

import sys
sys.path.append(str(Path(__file__).parent.parent))
from config import DB_PATH

logger = logging.getLogger(__name__)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS corridas (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp   TEXT NOT NULL,
    output_dir  TEXT NOT NULL,
    n_archivos  INTEGER NOT NULL,
    n_ok        INTEGER,
    n_errores   INTEGER,
    score_prom  REAL,
    duracion_s  REAL,
    completada  INTEGER DEFAULT 0
);
"""


class RunTracker:
    """Registra metadatos de cada corrida del pipeline en SQLite."""

    def __init__(self, db_path: str = str(DB_PATH)):
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(_SCHEMA)

    def iniciar_corrida(self, output_dir: str, n_archivos: int) -> int:
        """Registra el inicio de una corrida. Retorna el ID de corrida."""
        ts = datetime.now().isoformat(timespec='seconds')
        with sqlite3.connect(self.db_path) as conn:
            cur = conn.execute(
                "INSERT INTO corridas (timestamp, output_dir, n_archivos) VALUES (?, ?, ?)",
                (ts, output_dir, n_archivos)
            )
            run_id = cur.lastrowid
        logger.info(f"Corrida iniciada — ID={run_id}, output={output_dir}")
        return run_id

    def finalizar_corrida(
        self,
        run_id: int,
        n_ok: int,
        n_errores: int,
        score_promedio: float,
        duracion_s: float,
    ):
        """Actualiza la corrida con los resultados finales."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """UPDATE corridas
                   SET n_ok=?, n_errores=?, score_prom=?, duracion_s=?, completada=1
                   WHERE id=?""",
                (n_ok, n_errores, round(score_promedio, 2), round(duracion_s, 1), run_id)
            )
        logger.info(
            f"Corrida ID={run_id} completada — ok={n_ok}, err={n_errores}, "
            f"score_prom={score_promedio:.1f}, duracion={duracion_s:.0f}s"
        )

    def listar_corridas(self, limite: int = 10) -> list:
        """Retorna las últimas `limite` corridas como lista de dicts."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                "SELECT * FROM corridas ORDER BY id DESC LIMIT ?", (limite,)
            ).fetchall()
        return [dict(r) for r in rows]
