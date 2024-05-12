var config  = {
  "result": {
    "element": null
  },
  "remove": {
    "element": null
  },
  "download": {
    "element": null
  },
  "generate": {
    "element": null
  },
  "select": {
    "value": null,
    "element": null
  },
  "addon": {
    "homepage": function () {
      return chrome.runtime.getManifest().homepage_url;
    }
  },
  "text": {
    "value": null,
    "string": null,
    "encoder": null,
    "element": null,
  },
  "copy": {
    "to": {
      "clipboard": function (e) {
        if (e && e.target) {
          const table = e.target.closest("table");
          if (table) {
            const code = table.querySelector("#code");
            if (code) {
              code.select();
              document.execCommand("copy");
            }
          }
        }
      }
    }
  },
  "resize": {
    "timeout": null,
    "method": function () {
      if (config.port.name === "win") {
        if (config.resize.timeout) window.clearTimeout(config.resize.timeout);
        config.resize.timeout = window.setTimeout(async function () {
          const current = await chrome.windows.getCurrent();
          /*  */
          config.storage.write("interface.size", {
            "top": current.top,
            "left": current.left,
            "width": current.width,
            "height": current.height
          });
        }, 1000);
      }
    }
  },
  "load": function () {
    const reload = document.getElementById("reload");
    const support = document.getElementById("support");
    const donation = document.getElementById("donation");
    /*  */
    reload.addEventListener("click", function () {
      document.location.reload();
    }, false);
    /*  */
    support.addEventListener("click", function () {
      const url = config.addon.homepage();
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    donation.addEventListener("click", function () {
      const url = config.addon.homepage() + "?reason=support";
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    config.storage.load(config.app.start);
    window.removeEventListener("load", config.load, false);
  },
  "drop": {
    "items": {},
    "reader": null,
    "element": null,
    "filter": function (max) {
      for (let id in config.drop.items) {
        if (id !== "STRING") {
          const item = config.drop.items[id];
          const diff = ((new Date()).getTime() - item.time);
          const days = diff / 1000 / 60 / 60 / 24;
          /*  */
          if (days > max) {
            delete config.drop.items[id];
          }
        }
      }
    },
    "async": {
      "read": function (file) {
        return new Promise((resolve, reject) => {
          config.drop.reader = new FileReader();
          config.drop.reader.onload = function (e) {
            if (e && e.target) {
              if (e.target.result) {
                resolve(e.target.result);
              }
            }
          };
          /*  */
          config.drop.reader.readAsArrayBuffer(file);
        });
      }
    }
  },
  "port": {
    "name": '',
    "connect": function () {
      config.port.name = "webapp";
      const context = document.documentElement.getAttribute("context");
      /*  */
      if (chrome.runtime) {
        if (chrome.runtime.connect) {
          if (context !== config.port.name) {
            if (document.location.search === "?win") config.port.name = "win";
            chrome.runtime.connect({"name": config.port.name})
          }
        }
      }
      /*  */
      document.documentElement.setAttribute("context", config.port.name);
    }
  },
  "storage": {
    "local": {},
    "read": function (id) {
      return config.storage.local[id];
    },
    "load": function (callback) {
      chrome.storage.local.get(null, function (e) {
        config.storage.local = e;
        callback();
      });
    },
    "write": function (id, data) {
      if (id) {
        if (data !== '' && data !== null && data !== undefined) {
          let tmp = {};
          tmp[id] = data;
          config.storage.local[id] = data;
          chrome.storage.local.set(tmp, function () {});
        } else {
          delete config.storage.local[id];
          chrome.storage.local.remove(id, function () {});
        }
      }
    }
  },
  "app": {
    "start": function () {
      config.drop.element = document.getElementById("fileio");
      config.text.element = document.getElementById("textio");
      config.result.element = document.querySelector(".result");
      config.remove.element = document.getElementById("remove");
      config.select.element = document.getElementById("selector");
      config.download.element = document.getElementById("download");
      config.generate.element = document.getElementById("generate");
      /*  */
      config.drop.items = config.storage.read("drop-items") !== undefined ? config.storage.read("drop-items") : {};
      config.text.string = config.storage.read("text-string") !== undefined ? config.storage.read("text-string") : '';
      config.select.element.selectedIndex = config.storage.read("selected-index") !== undefined ? config.storage.read("selected-index") : 2;
      config.select.value = config.select.element.value;
      config.text.element.value = config.text.string;
      /*  */
      config.drop.element.addEventListener("change", config.listeners.drop, false);
      config.text.element.addEventListener("change", config.listeners.text, false);
      config.remove.element.addEventListener("click", config.listeners.remove, false);
      config.select.element.addEventListener("change", config.listeners.select, false);
      config.generate.element.addEventListener("click", config.listeners.generate, false);
      config.download.element.addEventListener("click", config.listeners.download, false);
      /*  */
      window.setTimeout(config.listeners.generate, 300);
    },
    "generate": {
      "hex": {
        "code": function (buffer) {
          const codes = [];
          const view = new DataView(buffer);
          for (let i = 0; i < view.byteLength; i += 4) {
            const value = {};
            const padding = "00000000";
            /*  */
            value.uint = view.getUint32(i);
            value.string = value.uint.toString(16);
            value.padding = (padding + value.string).slice(-padding.length);
            codes.push(value.padding);
          }
          /*  */
          return codes.join('');
        }
      },
      "hash": {
        "code": function (buffer, algorithm) {
          const a = algorithm === "SHA-1";
          const b = algorithm === "SHA-256";
          const c = algorithm === "SHA-384";
          const d = algorithm === "SHA-512";
          /*  */
          if (a || b || c || d) {
            return crypto.subtle.digest(algorithm, buffer).then(hash => {
              if (hash) {
                const hex = config.app.generate.hex.code(hash);
                if (hex) return hex;
              }
            });
          } else {
            const cryptojs = CryptoJS[algorithm];
            if (cryptojs) {
              const wordarray = CryptoJS.lib.WordArray.create(buffer);
              const hash = cryptojs(wordarray);
              if (hash) {
                const hex = hash.toString(CryptoJS.enc.Hex);
                if (hex) return hex;
              }
            }
          }
        }
      }
    }
  },
  "listeners": {
    "remove": async function () {
      const action = window.confirm("Are you sure you want to remove all the hash codes?");
      if (action) {
        config.drop.items = {};
        config.storage.write("drop-items", config.drop.items);
        /*  */
        window.setTimeout(config.listeners.generate, 0);
      }
    },
    "download": async function () {
      const action = window.confirm("Are you sure you want to download all the hash codes?");
      if (action) {
        const buttons = [...config.result.element.querySelectorAll(".download")];
        if (buttons && buttons.length) {
          for (let i = 0; i < buttons.length; i++) {
            await new Promise(resolve => window.setTimeout(resolve, 300));
            buttons[i].click();
          }
        }
      }
    },
    "select": async function (e) {
      if (e && e.target) {
        if (e.target.value) {
          config.select.value = e.target.value;
          config.storage.write("selected-index", e.target.selectedIndex);
          /*  */
          await config.listeners.drop();
          await config.listeners.text();
          /*  */
          await(new Promise(resolve => window.setTimeout(resolve, 300)));
          config.listeners.generate();
        }
      }
    },
    "text": async function () {
      config.generate.element.setAttribute("state", "loading");
      /*  */
      const target = config.text.element;
      if (target) {
        const value = target.value;
        const algorithm = config.select.value;
        config.storage.write("text-string", value);
        if (value && algorithm) {
          config.text.string = value;
          config.text.encoder = new TextEncoder();
          const buffer = config.text.encoder.encode(config.text.string);
          if (buffer) {
            const hash = await config.app.generate.hash.code(buffer, algorithm);
            if (hash) {
              config.drop.items["STRING"] = {
                "hash": hash,
                "name": "STRING",
                "time": (new Date()).getTime()
              };
            }
          }
        }
        /*  */
        config.generate.element.removeAttribute("state");
        config.storage.write("drop-items", config.drop.items);
      }
    },
    "drop": async function () {
      config.generate.element.setAttribute("state", "loading");
      /*  */
      const target = config.drop.element;
      if (target) {
        if (target.files) {
          const files = target.files;
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file && file.name) {
              const algorithm = config.select.value;
              const buffer = await config.drop.async.read(file);
              if (buffer && algorithm) {
                const hash = await config.app.generate.hash.code(buffer, algorithm);
                if (hash) {
                  config.drop.items[file.name] = {
                    "hash": hash,
                    "name": file.name,
                    "time": (new Date()).getTime()
                  };
                }
              }
            }
          }
          /*  */
          config.drop.filter(7);
          config.generate.element.removeAttribute("state");
          config.storage.write("drop-items", config.drop.items);
        }
      }
    },
    "click": function (e) {
      const classname = e.target.className;
      const dataid = e.target.getAttribute("dataid");
      /*  */
      if (classname && dataid) {
        if (classname === "copy") {
          config.copy.to.clipboard(e);
        } else if (classname === "remove") {
          delete config.drop.items[dataid];
          config.storage.write("drop-items", config.drop.items);
          /*  */
          window.setTimeout(config.listeners.generate, 0);
        } else if (classname === "download") {
          const a = document.createElement('a');
          const prefix = config.select.value.toLocaleLowerCase();
          const text = e.target.closest("table").querySelector("#code").value;
          const filename = e.target.closest("table").querySelector("#name").value;
          const href = "data:text/plain;charset=utf-8," + encodeURIComponent(text);
          const download = prefix + "-hash-" + filename.replace(/\./g, '-').toLocaleLowerCase() + ".txt"
          /*  */
          a.style.display = "none";
          a.setAttribute("href", href);
          a.setAttribute("download", download);
          document.body.appendChild(a);
          /*  */
          a.click();
          a.remove();
        }
      }
    },
    "generate": async function (e) {
      if (config.generate.element.getAttribute("state") === "loading") return;
      config.result.element.textContent = '';
      /*  */
      if (e && e.isTrusted) {
        const value = config.text.element.value;
        if (value) {
          await config.listeners.text();
        }
      }
      /*  */
      if (config.drop.items) {
        const keys = Object.keys(config.drop.items);
        if (keys && keys.length) {
          config.generate.element.setAttribute("state", "loading");
          /*  */
          for (let id in config.drop.items) {
            const file = config.drop.items[id];
            if (file) {
              if (file.name && file.hash) {
                const template = document.querySelector("template");
                if (template) {
                  const table = template.content.querySelector("table");
                  if (table) {
                    const clone = document.importNode(table, true);
                    if (clone) {
                      config.result.element.appendChild(clone);
                      /*  */
                      const name = clone.querySelector("#name");
                      const code = clone.querySelector("#code");
                      const copy = clone.querySelector(".copy");
                      const remove = clone.querySelector(".remove");
                      const download = clone.querySelector(".download");
                      /*  */
                      name.value = file.name;
                      code.value = file.hash;
                      copy.setAttribute("dataid", file.name);
                      remove.setAttribute("dataid", file.name);
                      download.setAttribute("dataid", file.name);
                      /*  */
                      copy.addEventListener("click", config.listeners.click,);
                      remove.addEventListener("click", config.listeners.click);
                      download.addEventListener("click", config.listeners.click);
                      /*  */
                      await(new Promise(resolve => window.setTimeout(resolve, 10)));
                    }
                  }
                }
              }
            }
          }
          /*  */
          config.generate.element.removeAttribute("state");
        }
      }
    }
  }
};

window.addEventListener("load", config.load, false);
window.addEventListener("resize", config.resize.method, false);
window.addEventListener("dragover", function (e) {e.preventDefault()});
window.addEventListener("drop", function (e) {if (e.target.id !== "fileio") e.preventDefault()});
