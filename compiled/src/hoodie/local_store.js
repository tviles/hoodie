// Generated by CoffeeScript 1.3.3
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Hoodie.LocalStore = (function(_super) {

  __extends(LocalStore, _super);

  function LocalStore(hoodie) {
    this.hoodie = hoodie;
    this.clear = __bind(this.clear, this);

    if (!this.isPersistent()) {
      this.db = {
        getItem: function() {
          return null;
        },
        setItem: function() {
          return null;
        },
        removeItem: function() {
          return null;
        },
        key: function() {
          return null;
        },
        length: function() {
          return 0;
        },
        clear: function() {
          return null;
        }
      };
    }
    this.hoodie.on('account:signout', this.clear);
  }

  LocalStore.prototype.db = {
    getItem: function(key) {
      return window.localStorage.getItem(key);
    },
    setItem: function(key, value) {
      return window.localStorage.setItem(key, value);
    },
    removeItem: function(key) {
      return window.localStorage.removeItem(key);
    },
    key: function(nr) {
      return window.localStorage.key(nr);
    },
    length: function() {
      return window.localStorage.length;
    },
    clear: function() {
      return window.localStorage.clear();
    }
  };

  LocalStore.prototype.save = function(type, id, object, options) {
    var defer, isNew;
    if (options == null) {
      options = {};
    }
    defer = LocalStore.__super__.save.apply(this, arguments);
    if (this.hoodie.isPromise(defer)) {
      return defer;
    }
    object = $.extend({}, object);
    if (id) {
      isNew = typeof this._cached["" + type + "/" + id] !== 'object';
    } else {
      isNew = true;
      id = this.uuid();
    }
    if (isNew && this.hoodie.my.account) {
      object.$createdBy || (object.$createdBy = this.hoodie.my.account.ownerHash);
    }
    if (options["public"] != null) {
      object.$public = options["public"];
    }
    if (options.remote) {
      object._syncedAt = this._now();
    } else if (!options.silent) {
      object.updatedAt = this._now();
      object.createdAt || (object.createdAt = object.updatedAt);
    }
    try {
      object = this.cache(type, id, object, options);
      defer.resolve(object, isNew).promise();
    } catch (error) {
      defer.reject(error).promise();
    }
    return defer.promise();
  };

  LocalStore.prototype.find = function(type, id) {
    var defer, object;
    defer = LocalStore.__super__.find.apply(this, arguments);
    if (this.hoodie.isPromise(defer)) {
      return defer;
    }
    try {
      object = this.cache(type, id);
      if (!object) {
        return defer.reject(Hoodie.Errors.NOT_FOUND(type, id)).promise();
      }
      defer.resolve(object);
    } catch (error) {
      defer.reject(error);
    }
    return defer.promise();
  };

  LocalStore.prototype.findAll = function(filter) {
    var currentType, defer, id, key, keys, obj, results, type;
    if (filter == null) {
      filter = function() {
        return true;
      };
    }
    defer = LocalStore.__super__.findAll.apply(this, arguments);
    if (this.hoodie.isPromise(defer)) {
      return defer;
    }
    keys = this._index();
    if (typeof filter === 'string') {
      type = filter;
      filter = function(obj) {
        return obj.type === type;
      };
    }
    try {
      results = (function() {
        var _i, _len, _ref, _results;
        _results = [];
        for (_i = 0, _len = keys.length; _i < _len; _i++) {
          key = keys[_i];
          if (!(this._isSemanticId(key))) {
            continue;
          }
          _ref = key.split('/'), currentType = _ref[0], id = _ref[1];
          obj = this.cache(currentType, id);
          if (filter(obj)) {
            _results.push(obj);
          } else {
            continue;
          }
        }
        return _results;
      }).call(this);
      defer.resolve(results).promise();
    } catch (error) {
      defer.reject(error).promise();
    }
    return defer.promise();
  };

  LocalStore.prototype.destroy = function(type, id, options) {
    var defer, key, object;
    if (options == null) {
      options = {};
    }
    defer = LocalStore.__super__.destroy.apply(this, arguments);
    if (this.hoodie.isPromise(defer)) {
      return defer;
    }
    object = this.cache(type, id);
    if (!object) {
      return defer.reject(Hoodie.Errors.NOT_FOUND(type, id)).promise();
    }
    if (object._syncedAt && !options.remote) {
      object._deleted = true;
      this.cache(type, id, object);
    } else {
      key = "" + type + "/" + id;
      this.db.removeItem(key);
      this._cached[key] = false;
      this.clearChanged(type, id);
    }
    return defer.resolve($.extend({}, object)).promise();
  };

  LocalStore.prototype.cache = function(type, id, object, options) {
    var key;
    if (object == null) {
      object = false;
    }
    if (options == null) {
      options = {};
    }
    key = "" + type + "/" + id;
    if (object) {
      this._cached[key] = $.extend(object, {
        type: type,
        id: id
      });
      this._setObject(type, id, object);
      if (options.remote) {
        this.clearChanged(type, id);
        return $.extend({}, this._cached[key]);
      }
    } else {
      if (this._cached[key] != null) {
        return $.extend({}, this._cached[key]);
      }
      this._cached[key] = this._getObject(type, id);
    }
    if (!options.silent) {
      if (this._cached[key] && (this._isDirty(this._cached[key]) || this._isMarkedAsDeleted(this._cached[key]))) {
        this.markAsChanged(type, id, this._cached[key]);
      } else {
        this.clearChanged(type, id);
      }
    }
    if (this._cached[key]) {
      return $.extend({}, this._cached[key]);
    } else {
      return this._cached[key];
    }
  };

  LocalStore.prototype.clearChanged = function(type, id) {
    var key;
    if (type && id) {
      key = "" + type + "/" + id;
      delete this._dirty[key];
    } else {
      this._dirty = {};
    }
    return this.hoodie.trigger('store:dirty');
  };

  LocalStore.prototype.isMarkedAsDeleted = function(type, id) {
    return this._isMarkedAsDeleted(this.cache(type, id));
  };

  LocalStore.prototype.markAsChanged = function(type, id, object) {
    var key, timeout,
      _this = this;
    key = "" + type + "/" + id;
    this._dirty[key] = object;
    this.hoodie.trigger('store:dirty');
    timeout = 2000;
    window.clearTimeout(this._dirtyTimeout);
    return this._dirtyTimeout = window.setTimeout((function() {
      return _this.hoodie.trigger('store:dirty:idle');
    }), timeout);
  };

  LocalStore.prototype.changedDocs = function() {
    var key, object, _ref, _results;
    _ref = this._dirty;
    _results = [];
    for (key in _ref) {
      object = _ref[key];
      _results.push(object);
    }
    return _results;
  };

  LocalStore.prototype.isDirty = function(type, id) {
    if (!type) {
      return $.isEmptyObject(this._dirty);
    }
    return this._isDirty(this.cache(type, id));
  };

  LocalStore.prototype.clear = function() {
    var defer;
    defer = this.hoodie.defer();
    try {
      this.db.clear();
      this._cached = {};
      this.clearChanged();
      defer.resolve();
    } catch (error) {
      defer.reject(error);
    }
    return defer.promise();
  };

  LocalStore.prototype.isPersistent = function() {
    try {
      if (!window.localStorage) {
        return false;
      }
      localStorage.setItem('Storage-Test', "1");
      if (localStorage.getItem('Storage-Test') !== "1") {
        return false;
      }
      localStorage.removeItem('Storage-Test');
    } catch (e) {
      return false;
    }
    return true;
  };

  LocalStore.prototype.uuid = function(len) {
    var chars, i, radix;
    if (len == null) {
      len = 7;
    }
    chars = '0123456789abcdefghijklmnopqrstuvwxyz'.split('');
    radix = chars.length;
    return ((function() {
      var _i, _results;
      _results = [];
      for (i = _i = 0; 0 <= len ? _i < len : _i > len; i = 0 <= len ? ++_i : --_i) {
        _results.push(chars[0 | Math.random() * radix]);
      }
      return _results;
    })()).join('');
  };

  LocalStore.prototype._setObject = function(type, id, object) {
    var key, store;
    key = "" + type + "/" + id;
    store = $.extend({}, object);
    delete store.type;
    delete store.id;
    return this.db.setItem(key, JSON.stringify(store));
  };

  LocalStore.prototype._getObject = function(type, id) {
    var json, key, obj;
    key = "" + type + "/" + id;
    json = this.db.getItem(key);
    if (json) {
      obj = JSON.parse(json);
      obj.type = type;
      obj.id = id;
      if (obj.createdAt) {
        obj.createdAt = new Date(Date.parse(obj.createdAt));
      }
      if (obj.updatedAt) {
        obj.updatedAt = new Date(Date.parse(obj.updatedAt));
      }
      if (obj._syncedAt) {
        obj._syncedAt = new Date(Date.parse(obj._syncedAt));
      }
      return obj;
    } else {
      return false;
    }
  };

  LocalStore.prototype._now = function() {
    return new Date;
  };

  LocalStore.prototype._isValidId = function(key) {
    return /^[a-z0-9\-]+$/.test(key);
  };

  LocalStore.prototype._isValidType = function(key) {
    return /^[a-z$][a-z0-9]+$/.test(key);
  };

  LocalStore.prototype._isSemanticId = function(key) {
    return /^[a-z$][a-z0-9]+\/[a-z0-9]+$/.test(key);
  };

  LocalStore.prototype._cached = {};

  LocalStore.prototype._dirty = {};

  LocalStore.prototype._isDirty = function(object) {
    if (!object._syncedAt) {
      return true;
    }
    if (!object.updatedAt) {
      return false;
    }
    return object._syncedAt.getTime() < object.updatedAt.getTime();
  };

  LocalStore.prototype._isMarkedAsDeleted = function(object) {
    return object._deleted === true;
  };

  LocalStore.prototype._index = function() {
    var i, _i, _ref, _results;
    _results = [];
    for (i = _i = 0, _ref = this.db.length(); 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      _results.push(this.db.key(i));
    }
    return _results;
  };

  return LocalStore;

})(Hoodie.Store);
