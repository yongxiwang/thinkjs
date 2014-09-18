var fs = require('fs');
var path = require('path');
var util = require('util');
var crypto = require('crypto');
var net = require('net');

/**
 * Promise，后续Node.js会默认支持Promise，所以这里加个判断
 * @type {[type]}
 */
if (!global.Promise) {
  global.Promise = require('es6-promise').Promise;
}

/**
 * 动态创建一个类
 * 提供了继承、扩展、调用父级别方法等方法
 * @return {[type]} [description]
 */
global.Class = function (prop, superCls) {
  'use strict';
  var cls = function () {
    function T(args) {
      for(var name in cls.__prop){
        var val = cls.__prop[name];
        this[name] = isObject(val) ? extend({}, val) : val;
      }
      //自动执行init方法
      if(isFunction(this.init)){
        //获取init返回值，如果返回一个promise，可以让后续执行在then之后
        this.__initReturn = this.init.apply(this, args);
      }
      return this;
    }
    T.prototype = cls.prototype;
    T.constructor = cls;
    return new T(arguments);
  };
  //类的属性，不放在原型上，实例化的时候调用
  cls.__prop = {};
  cls.extend = function(prop){
    if (isFunction(prop)) {
      prop = prop();
    }
    if (isObject(prop)) {
      for(var name in prop){
        var val = prop[name];
        if (isFunction(val)) {
          this.prototype[name] = val;
        }else{
          cls.__prop[name] = isObject(val) ? extend({}, val) : val;
        }
      }
    }
    return this;
  };
  cls.inherits = function(superCls){
    util.inherits(this, superCls);
    //将父级的属性复制到当前类上
    extend(cls.__prop, superCls.__prop);
    return this;
  };
  if (superCls === true && isFunction(prop)) {
    superCls = prop;
    prop = undefined;
  }
  if (isFunction(superCls)) {
    cls.inherits(superCls);
  }
  //调用父级方法
  cls.prototype.super = cls.prototype.super_ = function(name, data){
    //如果当前类没有这个方法，则直接返回。
    //用于在a方法调用父级的b方法
    if (!this[name]) {
      this.super_c = null;
      return;
    }
    var super_ = this.super_c ? this.super_c.super_ : this.constructor.super_;
    if (!super_) {
      this.super_c = null;
      return;
    }
    //如果父级没有这个方法，那么直接返回
    if (!isFunction(super_.prototype[name])) {
      this.super_c = null;
      return;
    }
    while(this[name] === super_.prototype[name] && super_.super_){
      super_ = super_.super_;
    }
    this.super_c = super_;
    if (!this.super_t) {
      this.super_t = 1;
    }
    //如果参数不是数组，自动转为数组
    if (!isArray(data)) {
      data = arguments.length === 1 ? [] : [data];
    }
    var t = ++this.super_t;
    var method = super_.prototype[name];
    var ret;
    switch(data.length){
      case 0:
        ret = method.call(this);
        break;
      case 1:
        ret = method.call(this, data[0]);
        break;
      case 2:
        ret = method.call(this, data[0], data[1]);
        break;
      default:
        ret = method.apply(this, data);
    }
    if (t === this.super_t) {
      this.super_c = null;
      this.super_t = 0;
    }
    return ret;
  };
  if (prop) {
    cls.extend(prop);
  }
  return cls;
};
/**
 * extend, from jquery，具有深度复制功能
 * @return {[type]} [description]
 */
global.extend = function(){
  'use strict';
  var args = [].slice.call(arguments);
  var deep = true;
  var target = args.shift();
  if (isBoolean(target)) {
    deep = target;
    target = args.shift();
  }
  target = target || {};
  var length = args.length;
  var options, name, src, copy, copyAsArray, clone;
  for(var i = 0; i < length; i++){
    options = args[i] || {};
    if (isFunction(options)) {
      options = options();
    }
    for(name in options){
      src = target[name];
      copy = options[name];
      if (src === copy) {
        continue;
      }
      if (deep && copy && (isObject(copy) || (copyAsArray = isArray(copy) ))) {
        if (copyAsArray) {
          copyAsArray = false;
          clone = src && isArray(src) ? src : [];
        }else{
          clone = src && isObject(src) ? src : {}; 
        }
        target[name] = extend(deep, clone, copy);
      }else if (copy !== undefined) {
        target[name] = copy;
      }
    }
  }
  return target;
};


//Object上toString方法
var toString = Object.prototype.toString;

/**
 * 是否是boolean
 * @param  {[type]}  obj
 * @return {Boolean}
 */
global.isBoolean = function(obj){
  'use strict';
  return toString.call(obj) === '[object Boolean]';
};
/**
 * 是否是数字
 * @param  {[type]}  obj [description]
 * @return {Boolean}     [description]
 */
global.isNumber = function(obj){
  'use strict';
  return toString.call(obj) === '[object Number]';
};
/**
 * 是否是个对象
 * @param  {[type]}  obj [description]
 * @return {Boolean}     [description]
 */
global.isObject = function(obj){
  'use strict';
  if (isBuffer(obj)) {
    return false;
  }
  return toString.call(obj) === '[object Object]';
};
/**
 * 是否是字符串
 * @param  {[type]}  obj [description]
 * @return {Boolean}     [description]
 */
global.isString = function(obj){
  'use strict';
  return toString.call(obj) === '[object String]';
};
/**
 * 是否是个function
 * @param  {[type]}  obj [description]
 * @return {Boolean}     [description]
 */
global.isFunction = function(obj){
  'use strict';
  return typeof obj === 'function';
};
/**
 * 是否是日期
 * @return {Boolean} [description]
 */
global.isDate = function(obj){
  'use strict';
  return util.isDate(obj);
};
/**
 * 是否是正则
 * @param  {[type]}  reg [description]
 * @return {Boolean}     [description]
 */
global.isRegexp = function(obj){
  'use strict';
  return util.isRegExp(obj);
};
/**
 * 是否是个错误
 * @param  {[type]}  obj [description]
 * @return {Boolean}     [description]
 */
global.isError = function(obj){
  'use strict';
  return util.isError(obj);
};
/**
 * 判断对象是否为空
 * @param  {[type]}  obj
 * @return {Boolean}
 */
global.isEmpty = function(obj){
  'use strict';
  if (isObject(obj)) {
    var key;
    for(key in obj){
      return false;
    }
    return true;
  }else if (isArray(obj)) {
    return obj.length === 0;
  }else if (isString(obj)) {
    return obj.length === 0;
  }else if (isNumber(obj)) {
    return obj === 0;
  }else if (obj === null || obj === undefined) {
    return true;
  }else if (isBoolean(obj)) {
    return !obj;
  }
  return false;
};
/**
 * 是否是个标量
 * @param  {[type]}  obj [description]
 * @return {Boolean}     [description]
 */
global.isScalar = function(obj){
  'use strict';
  return isBoolean(obj) || isNumber(obj) || isString(obj);
};
/**
 * 是否是个数组
 * @type {Boolean}
 */
global.isArray = Array.isArray;
/**
 * 是否是IP
 * @type {Boolean}
 */
global.isIP = net.isIP;
global.isIP4 = net.isIP4;
global.isIP6 = net.isIP6;
/**
 * 是否是个文件
 * @param  {[type]}  p [description]
 * @return {Boolean}   [description]
 */
global.isFile = function(p){
  'use strict';
  if (!fs.existsSync(p)) {
    return false;
  }
  var stats = fs.statSync(p);
  return stats.isFile();
};
/**
 * 是否是个目录
 * @param  {[type]}  p [description]
 * @return {Boolean}   [description]
 */
global.isDir = function(p){
  'use strict';
  if (!fs.existsSync(p)) {
    return false;
  }
  var stats = fs.statSync(p);
  return stats.isDirectory();
};
/**
 * 是否是buffer
 * @type {Boolean}
 */
global.isBuffer = Buffer.isBuffer;
/**
 * 是否是个数字的字符串
 * @param  {[type]}  obj [description]
 * @return {Boolean}     [description]
 */
var numberReg = /^((\-?\d*\.?\d*(?:e[+-]?\d*(?:\d?\.?|\.?\d?)\d*)?)|(0[0-7]+)|(0x[0-9a-f]+))$/i;
global.isNumberString = function(obj){
  'use strict';
  return numberReg.test(obj);
};
/**
 * 判断是否是个promise
 * @param  {[type]}  obj [description]
 * @return {Boolean}     [description]
 */
global.isPromise = function(obj){
  'use strict';
  return !!(obj && typeof obj.then === 'function');
};

/**
 * 判断一个文件或者目录是否可写
 * @param  {[type]}  p [description]
 * @return {Boolean}      [description]
 */
global.isWritable = function(p){
  'use strict';
  if (!fs.existsSync(p)) {
    return false;
  }
  var stats = fs.statSync(p);
  var mode = stats.mode;
  var uid = process.getuid ? process.getuid() : 0;
  var gid = process.getgid ? process.getgid() : 0;
  var owner = uid === stats.uid;
  var group = gid === stats.gid;
  return !!(owner && (mode & parseInt('00200', 8)) || 
      group && (mode & parseInt('00020', 8)) || 
      (mode & parseInt('00002', 8)));
};

/**
 * 递归创建目录，同步模式
 * @param  {[type]} p    [description]
 * @param  {[type]} mode [description]
 * @return {[type]}      [description]
 */
global.mkdir = function(p, mode){
  'use strict';
  mode = mode || '0777';
  if (fs.existsSync(p)) {
    chmod(p, mode);
    return true;
  }
  var pp = path.dirname(p);
  if (fs.existsSync(pp)) {
    fs.mkdirSync(p, mode);
  }else{
    mkdir(pp, mode);
    mkdir(p, mode);
  }
  return true;
};
/**
 * 递归的删除目录，返回promise
 * @param  string p       要删除的目录
 * @param  boolean reserve 是否保留当前目录，只删除子目录
 * @return Promise         
 */
global.rmdir = function(p, reserve){
  'use strict';
  if (!isDir(p)) {
    return getPromise();
  }
  var deferred = getDefer();
  fs.readdir(p, function(err, files){
    if (err) {
      return deferred.reject(err);
    }
    var promises = files.map(function(item){
      var filepath = path.normalize(p + '/' + item);
      if (isDir(filepath)) {
        return rmdir(filepath, false);
      }else{
        var deferred = getDefer();
        fs.unlink(filepath, function(err){
          return err ? deferred.reject(err) : deferred.resolve();
        })
        return deferred.promise;
      }
    })
    var promise = files.length === 0 ? getPromise() : Promise.all(promises);
    return promise.then(function(){
      if (!reserve) {
        var deferred = getDefer();
        fs.rmdir(p, function(err){
          return err ? deferred.reject(err) : deferred.resolve();
        })
        return deferred.promise;
      }
    }).then(function(){
      deferred.resolve();
    }).catch(function(err){
      deferred.reject(err);
    })
  })
  return deferred.promise;
}
/**
 * 修改目录或者文件权限
 * @param  {[type]} p    [description]
 * @param  {[type]} mode [description]
 * @return {[type]}      [description]
 */
global.chmod = function(p, mode){
  'use strict';
  mode = mode || '0777';
  if (!fs.existsSync(p)) {
    return true;
  }
  return fs.chmodSync(p, mode);
};
/**
 * 获取文件内容
 * @param  {[type]} file [description]
 * @return {[type]}      [description]
 */
global.getFileContent = function(file, encoding){
  'use strict';
  if (!fs.existsSync(file)) {
    return '';
  }
  return fs.readFileSync(file, encoding || 'utf8');
};
/**
 * 设置文件内容
 * @param  {[type]} file [description]
 * @param  {[type]} data [description]
 * @return {[type]}      [description]
 */
global.setFileContent = function(file, data){
  'use strict';
  var filepath = path.dirname(file);
  mkdir(filepath);
  return fs.writeFileSync(file, data);
};
/**
 * 大写首字符
 * @param  {[type]} name [description]
 * @return {[type]}      [description]
 */
global.ucfirst = function(name){
  'use strict';
  name = (name || '') + '';
  return name.substr(0,1).toUpperCase() + name.substr(1).toLowerCase();
};
/**
 * 获取字符串的md5
 * @param  {[type]} str [description]
 * @return {[type]}     [description]
 */
global.md5 = function(str){
  'use strict';
  var instance = crypto.createHash('md5');
  instance.update(str + '');
  return instance.digest('hex');
};
/**
 * 获取随机整数
 * @return {[type]} [description]
 */
global.rand = function(min, max){
  'use strict';
  return Math.floor(min + Math.random() * (max - min + 1));
}
/**
 * 生成一个promise,如果传入的参数是promise则直接返回
 * @param  {[type]} obj [description]
 * @return {[type]}     [description]
 */
global.getPromise = function(obj, reject){
  'use strict';
  if (isPromise(obj)) {
    return obj;
  }
  if (reject) {
    return Promise.reject(obj);
  }
  return Promise.resolve(obj);
};
/**
 * 生成一个defer对象
 * @return {[type]} [description]
 */
global.getDefer = function(){
  'use strict';
  var deferred = {};
  deferred.promise = new Promise(function(resolve, reject){
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
};
/**
 * 快速生成一个object
 * @param  {[type]} key   [description]
 * @param  {[type]} value [description]
 * @return {[type]}       [description]
 */
global.getObject = function(key, value){
  'use strict';
  var obj = {};
  if (!isArray(key)) {
    obj[key] = value;
    return obj;
  }
  key.forEach(function(item, i){
    obj[item] = value[i];
  });
  return obj;
};
/**
 * 将数组变成对象
 * @param  {[type]} arr       [description]
 * @param  {[type]} key       [description]
 * @param  {[type]} valueKeys [description]
 * @return {[type]}           [description]
 */
global.arrToObj = function(arr, key, valueKey){
  'use strict';
  var result = {};
  var arrResult = [];
  arr.forEach(function(item){
    var keyValue = item[key];
    if (valueKey === null) {
      arrResult.push(keyValue);
    }else if (valueKey) {
      result[keyValue] = item[valueKey];
    }else{
      result[keyValue] = item;
    }
  })
  return valueKey === null ? arrResult : result;
}