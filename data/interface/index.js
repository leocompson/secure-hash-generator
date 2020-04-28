var config  = {
  "result": {"element": null},
  "resize": {"timeout": null},
  "remove": {"element": null},
  "download": {"element": null},
  "generate": {"element": null},
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
          var code = e.target.closest("table").querySelector("#code");
          if (code) {
            code.select();
            document.execCommand("copy");
          }
        }
      }
    }
  },
  "drop": {
    "items": {},
    "reader": null,
    "element": null,
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
  "storage": {
    "local": {},
    "read": function (id) {return config.storage.local[id]},
    "load": function (callback) {
      chrome.storage.local.get(null, function (e) {
        config.storage.local = e;
        callback();
      });
    },
    "write": function (id, data) {
      if (id) {
        if (data !== '' && data !== null && data !== undefined) {
          var tmp = {};
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
          var codes = [];
          var view = new DataView(buffer);
          for (var i = 0; i < view.byteLength; i += 4) {
            var value = {};
            var padding = "00000000";
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
          var a = algorithm === "SHA-1";
          var b = algorithm === "SHA-256";
          var c = algorithm === "SHA-384";
          var d = algorithm === "SHA-512";
          /*  */
          if (a || b || c || d) {
            return crypto.subtle.digest(algorithm, buffer).then(hash => {
              if (hash) {
                var hex = config.app.generate.hex.code(hash);
                if (hex) return hex;
              }
            });
          } else {
            var cryptojs = CryptoJS[algorithm];
            if (cryptojs) {
              var wordArray = CryptoJS.lib.WordArray.create(buffer);
              var hash = cryptojs(wordArray);
              if (hash) {
                var hex = hash.toString(CryptoJS.enc.Hex);
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
      var action = window.confirm("Are you sure you want to remove all the hash codes?");
      if (action) {
        config.drop.items = {};
        config.storage.write("drop-items", config.drop.items);
        /*  */
        window.setTimeout(config.listeners.generate, 0);
      }
    },
    "download": async function () {
      var action = window.confirm("Are you sure you want to download all the hash codes?");
      if (action) {
        var buttons = [...config.result.element.querySelectorAll(".download")];
        if (buttons && buttons.length) {
          for (var i = 0; i < buttons.length; i++) {
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
      var target = config.text.element;
      if (target) {
        var value = target.value;
        var algorithm = config.select.value;
        config.storage.write("text-string", value);
        if (value && algorithm) {
          config.text.string = value;
          config.text.encoder = new TextEncoder();
          var buffer = config.text.encoder.encode(config.text.string);
          if (buffer) {
            var hash = await config.app.generate.hash.code(buffer, algorithm);
            if (hash) {
              config.drop.items["string"] = {
                "hash": hash,
                "name": "string"
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
      var target = config.drop.element;
      if (target) {
        if (target.files) {
          var files = target.files;
          for (var i = 0; i < files.length; i++) {
            var file = files[i];
            if (file && file.name) {
              var algorithm = config.select.value;
              var buffer = await config.drop.async.read(file);
              if (buffer && algorithm) {
                var hash = await config.app.generate.hash.code(buffer, algorithm);
                if (hash) {
                  config.drop.items[file.name] = {
                    "hash": hash,
                    "name": file.name
                  };
                }
              }
            }
          }
          /*  */
          config.generate.element.removeAttribute("state");
          config.storage.write("drop-items", config.drop.items);
        }
      }
    },
    "click": function (e) {
      var classname = e.target.className;
      var dataid = e.target.getAttribute("dataid");
      /*  */
      if (classname && dataid) {
        if (classname === "copy") config.copy.to.clipboard(e);
        else if (classname === "remove") {
          delete config.drop.items[dataid];
          config.storage.write("drop-items", config.drop.items);
          /*  */
          window.setTimeout(config.listeners.generate, 0);
        } else if (classname === "download") {
          var a = document.createElement('a');
          var prefix = config.select.value.toLocaleLowerCase();
          var text = e.target.closest("table").querySelector("#code").value;
          var filename = e.target.closest("table").querySelector("#name").value;
          /*  */
          a.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
          a.setAttribute("download", prefix + "-hash-" + filename);
          a.style.display = "none";
          document.body.appendChild(a);
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
        var value = config.text.element.value;
        if (value) {
          await config.listeners.text();
        }
      }
      /*  */
      if (config.drop.items) {
        var keys = Object.keys(config.drop.items);
        if (keys && keys.length) {
          config.generate.element.setAttribute("state", "loading");
          /*  */
          for (var id in config.drop.items) {
            var file = config.drop.items[id];
            if (file) {
              if (file.name && file.hash) {
                var template = document.querySelector("template");
                if (template) {
                  var table = template.content.querySelector("table");
                  if (table) {
                    var clone = document.importNode(table, true);
                    if (clone) {
                      config.result.element.appendChild(clone);
                      /*  */
                      var name = clone.querySelector("#name");
                      var code = clone.querySelector("#code");
                      var copy = clone.querySelector(".copy");
                      var remove = clone.querySelector(".remove");
                      var download = clone.querySelector(".download");
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

var load = function () {
  var reload = document.getElementById("reload");
  var support = document.getElementById("support");
  var donation = document.getElementById("donation");
  /*  */
  support.addEventListener("click", function (e) {
    var url = config.addon.homepage();
    if (config.context.extension) {
      chrome.tabs.create({"url": url, "active": true});
    }
  }, false);
  /*  */
  donation.addEventListener("click", function (e) {
    var url = config.addon.homepage() + "?reason=support";
    if (config.context.extension) {
      chrome.tabs.create({"url": url, "active": true});
    }
  }, false);
  /*  */
  window.addEventListener("resize", function (e) {
    config.storage.write("width", window.innerWidth || window.outerWidth);
    config.storage.write("height", window.innerHeight || window.outerHeight);
  }, false);
  /*  */
  config.storage.load(config.app.start);
  window.removeEventListener("load", load, false);
  reload.addEventListener("click", function (e) {document.location.reload()}, false);
};

window.addEventListener("resize", function () {
  if (config.resize.timeout) window.clearTimeout(config.resize.timeout);
  config.resize.timeout = window.setTimeout(function () {
    config.storage.write("width", window.innerWidth || window.outerWidth);
    config.storage.write("height", window.innerHeight || window.outerHeight);
  }, 1000);
}, false);

window.addEventListener("load", load, false);
window.addEventListener("dragover", function (e) {e.preventDefault()});
window.addEventListener("drop", function (e) {if (e.target.id !== "fileio") e.preventDefault()});
