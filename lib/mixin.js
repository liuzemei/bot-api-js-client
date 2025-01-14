"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _nodeForge = _interopRequireDefault(require("node-forge"));

var _moment = _interopRequireDefault(require("moment"));

var _jsonwebtoken = _interopRequireDefault(require("jsonwebtoken"));

var _v = _interopRequireDefault(require("uuid/v4"));

var _int64Buffer = _interopRequireDefault(require("int64-buffer"));

var _crypto = _interopRequireDefault(require("crypto"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function Mixin() {}

Mixin.prototype = {
  generateSessionKeypair: function generateSessionKeypair() {
    var keypair = _nodeForge["default"].pki.rsa.generateKeyPair({
      bits: 2048,
      e: 0x10001
    });

    var body = _nodeForge["default"].asn1.toDer(_nodeForge["default"].pki.publicKeyToAsn1(keypair.publicKey)).getBytes();

    var public_key = _nodeForge["default"].util.encode64(body, 64);

    var private_key = _nodeForge["default"].pki.privateKeyToPem(keypair.privateKey);

    return {
      "public": public_key,
      "private": private_key
    };
  },
  signAuthenticationToken: function signAuthenticationToken(uid, sid, privateKey, method, uri, params, scp) {
    if (_typeof(params) === "object") {
      params = JSON.stringify(params);
    } else if (typeof params !== "string") {
      params = "";
    }

    var expire = _moment["default"].utc().add(30, 'minutes').unix();

    var md = _nodeForge["default"].md.sha256.create();

    md.update(_nodeForge["default"].util.encodeUtf8(method + uri + params));
    var payload = {
      uid: uid,
      sid: sid,
      iat: _moment["default"].utc().unix(),
      exp: expire,
      jti: (0, _v["default"])(),
      sig: md.digest().toHex(),
      scp: scp
    };
    return _jsonwebtoken["default"].sign(payload, privateKey, {
      algorithm: 'RS512'
    });
  },
  signEncryptedPin: function signEncryptedPin(pin, pinToken, sessionId, privateKey, iterator) {
    var blockSize = 16;
    var Uint64LE = _int64Buffer["default"].Int64BE;
    pinToken = new Buffer(pinToken, 'base64');
    privateKey = _nodeForge["default"].pki.privateKeyFromPem(privateKey);
    var pinKey = privateKey.decrypt(pinToken, 'RSA-OAEP', {
      md: _nodeForge["default"].md.sha256.create(),
      label: sessionId
    });
    var time = new Uint64LE(_moment["default"].utc().unix());
    time = _toConsumableArray(time.toBuffer()).reverse();

    if (iterator == undefined || iterator === "") {
      iterator = Date.now() * 1000000;
    }

    iterator = new Uint64LE(iterator);
    iterator = _toConsumableArray(iterator.toBuffer()).reverse();
    pin = Buffer.from(pin, 'utf8');
    var buf = Buffer.concat([pin, Buffer.from(time), Buffer.from(iterator)]);
    var padding = blockSize - buf.length % blockSize;
    var paddingArray = [];

    for (var i = 0; i < padding; i++) {
      paddingArray.push(padding);
    }

    buf = Buffer.concat([buf, new Buffer(paddingArray)]);

    var iv16 = _nodeForge["default"].random.getBytesSync(16);

    var key = this.hexToBytes(_nodeForge["default"].util.binary.hex.encode(pinKey));

    var cipher = _nodeForge["default"].cipher.createCipher('AES-CBC', key);

    cipher.start({
      iv: iv16
    });
    cipher.update(buf);
    cipher.finish();
    var encrypted_pin_buff = cipher.output;
    encrypted_pin_buff = Buffer.concat([iv16, encrypted_pin_buff]);
    return Buffer.from(encrypted_pin_buff).toString('base64');
  },
  hexToBytes: function hexToBytes(hex) {
    var bytes = [];

    for (var c = 0; c < hex.length; c += 2) {
      bytes.push(parseInt(hex.substr(c, 2), 16));
    }

    return bytes;
  },
  environment: function environment() {
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.MixinContext) {
      return 'iOS';
    }

    if (window.MixinContext && window.MixinContext.getContext) {
      return 'Android';
    }

    return undefined;
  },
  getMixinContext: function getMixinContext() {
    var ctx;

    switch (this.environment()) {
      case 'iOS':
        ctx = prompt('MixinContext.getContext()');
        return JSON.parse(ctx);

      case 'Android':
        ctx = window.MixinContext.getContext();
        return JSON.parse(ctx);

      default:
        return undefined;
    }
  },
  conversationId: function conversationId() {
    var ctx = this.getMixinContext();

    if (ctx) {
      return ctx.conversation_id;
    }
  },
  reloadTheme: function reloadTheme() {
    var ctx = this.getMixinContext();

    if (ctx) {
      ctx.reloadTheme();
    }
  }
};
var _default = Mixin;
exports["default"] = _default;