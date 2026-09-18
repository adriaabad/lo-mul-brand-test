(function () {
  "use strict";

  function key(projectId) {
    return `lo-mul-visual-test:${projectId}:v2`;
  }

  function load(projectId) {
    try {
      const value = localStorage.getItem(key(projectId));
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn("No s’ha pogut recuperar la sessió local.", error);
      return null;
    }
  }

  function save(projectId, state) {
    try {
      localStorage.setItem(key(projectId), JSON.stringify(state));
      return true;
    } catch (error) {
      console.warn("No s’ha pogut desar la sessió local.", error);
      return false;
    }
  }

  function clear(projectId) {
    localStorage.removeItem(key(projectId));
  }

  window.LoMulStorage = { load, save, clear };
})();
