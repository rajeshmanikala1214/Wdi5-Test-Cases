"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var Authenticator_js_1 = __importDefault(require("./Authenticator.js"));
var playwright_client_certificate_login_1 = require("playwright-client-certificate-login");
var CertAuthenticator = /** @class */ (function (_super) {
    __extends(CertAuthenticator, _super);
    function CertAuthenticator(options, browserInstanceName, baseUrl) {
        var _this = _super.call(this, browserInstanceName) || this;
        _this.origin = options.certificateOrigin || "https://accounts.sap.com";
        _this.url = options.certificateUrl || baseUrl;
        _this.pfxPath = options.certificatePfxPath;
        _this.pfxPassword = options.certificatePfxPassword;
        return _this;
    }
    CertAuthenticator.prototype.login = function () {
        return __awaiter(this, void 0, void 0, function () {
            var sapSession, cookies, cookies_1, cookies_1_1, cookie, domain, error_1, e_1_1, error_2;
            var e_1, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.getIsLoggedIn()];
                    case 1:
                        if (!!(_b.sent())) return [3 /*break*/, 23];
                        sapSession = void 0;
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 18, 19, 22]);
                        // Instantiate the CertificateAuthSession
                        // sapSession = new CertificateAuthSession({
                        //     origin: "https://accounts.sap.com",
                        //     url: "https://emea.cockpit.btp.cloud.sap/cockpit#/", // Target URL for login
                        //     pfxPath: "./sap.pfx", // Updated PFX file path created in workflow
                        //     passphrase: "", // Passphrase for PFX if needed
                        //     timeout: 60000 // Optional timeout
                        // })
                        sapSession = new playwright_client_certificate_login_1.CertificateAuthSession({
                            origin: this.origin,
                            url: this.url, // Target URL for login
                            pfxPath: this.pfxPath, // Updated PFX file path created in workflow
                            passphrase: this.pfxPassword, // Passphrase for PFX if needed
                            timeout: 60000 // Optional timeout
                        });
                        // Authenticate
                        return [4 /*yield*/, sapSession.authenticate()
                            // Check if login was successful by verifying the URL or a page element
                            // const page = sapSession.getPage()
                        ];
                    case 3:
                        // Authenticate
                        _b.sent();
                        cookies = sapSession.getCookies();
                        _b.label = 4;
                    case 4:
                        _b.trys.push([4, 14, 15, 16]);
                        cookies_1 = __values(cookies), cookies_1_1 = cookies_1.next();
                        _b.label = 5;
                    case 5:
                        if (!!cookies_1_1.done) return [3 /*break*/, 13];
                        cookie = cookies_1_1.value;
                        _b.label = 6;
                    case 6:
                        _b.trys.push([6, 11, , 12]);
                        if (!cookie.name.startsWith("__HOST-")) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.browserInstance.setCookies({
                                name: cookie.name,
                                value: cookie.value,
                                path: "/",
                                secure: true,
                                sameSite: cookie.sameSite || "Strict",
                                httpOnly: cookie.httpOnly
                            })];
                    case 7:
                        _b.sent();
                        return [3 /*break*/, 10];
                    case 8:
                        domain = "sap.com";
                        return [4 /*yield*/, this.browserInstance.setCookies({
                                name: cookie.name,
                                value: cookie.value,
                                domain: domain,
                                path: cookie.path,
                                httpOnly: cookie.httpOnly,
                                secure: cookie.secure,
                                sameSite: cookie.sameSite
                            })];
                    case 9:
                        _b.sent();
                        _b.label = 10;
                    case 10: return [3 /*break*/, 12];
                    case 11:
                        error_1 = _b.sent();
                        console.warn("Failed to set cookie ".concat(cookie.name, ": ").concat(error_1.message));
                        return [3 /*break*/, 12];
                    case 12:
                        cookies_1_1 = cookies_1.next();
                        return [3 /*break*/, 5];
                    case 13: return [3 /*break*/, 16];
                    case 14:
                        e_1_1 = _b.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 16];
                    case 15:
                        try {
                            if (cookies_1_1 && !cookies_1_1.done && (_a = cookies_1.return)) _a.call(cookies_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                        return [7 /*endfinally*/];
                    case 16: return [4 /*yield*/, this.browserInstance.refresh()];
                    case 17:
                        _b.sent();
                        return [3 /*break*/, 22];
                    case 18:
                        error_2 = _b.sent();
                        console.error("Error during login:", error_2.message);
                        process.exit(1); // Exit with failure on error
                        return [3 /*break*/, 22];
                    case 19:
                        if (!sapSession) return [3 /*break*/, 21];
                        return [4 /*yield*/, sapSession.close()];
                    case 20:
                        _b.sent();
                        _b.label = 21;
                    case 21: return [7 /*endfinally*/];
                    case 22:
                        this.setIsLoggedIn(true);
                        _b.label = 23;
                    case 23: return [2 /*return*/];
                }
            });
        });
    };
    return CertAuthenticator;
}(Authenticator_js_1.default));
exports.default = CertAuthenticator;
//# sourceMappingURL=CertAuthenticator.js.map