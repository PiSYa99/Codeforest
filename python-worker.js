import { loadPyodide } from './vendor/pyodide.mjs';

const PYODIDE_BASE = new URL('./vendor/', self.location.href).href;
const GAME_FILES = ['chapter7.py', 'levels.py', 'engine.py'];

function status(message) {
  self.postMessage({ type: 'status', message });
}

const ready = (async () => {
  status('Загружается Python…');
  const pyodide = await loadPyodide({ indexURL: PYODIDE_BASE });

  status('Загружаются квесты…');
  for (const filename of GAME_FILES) {
    const response = await fetch(new URL(filename, self.location.href));
    if (!response.ok) throw new Error(`Не удалось загрузить ${filename}.`);
    pyodide.FS.writeFile(filename, await response.text());
  }

  await pyodide.runPythonAsync(`
import json
from levels import LEVELS
from engine import initial, run
  `);
  status('Python готов');
  return pyodide;
})();

self.onmessage = async ({ data }) => {
  const id = data?.id;
  try {
    const pyodide = await ready;
    let encoded;

    if (data.type === 'levels') {
      encoded = await pyodide.runPythonAsync(`
json.dumps(
    [dict(level, initial=initial(level)) for level in LEVELS],
    ensure_ascii=False
)
      `);
    } else if (data.type === 'run') {
      pyodide.globals.set('_level_id', data.level);
      pyodide.globals.set('_student_code', data.code);
      try {
        encoded = await pyodide.runPythonAsync(`
json.dumps(run(_level_id, _student_code), ensure_ascii=False)
        `);
      } finally {
        pyodide.globals.delete('_level_id');
        pyodide.globals.delete('_student_code');
      }
    } else {
      throw new Error('Неизвестная команда игровой среды.');
    }

    self.postMessage({ id, result: JSON.parse(encoded) });
  } catch (error) {
    self.postMessage({ id, error: error?.message || String(error) });
  }
};
