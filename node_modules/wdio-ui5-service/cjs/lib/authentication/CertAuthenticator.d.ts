import { CertAuthenticator as CertAuthenticatorType } from "../../types/wdi5.types.js";
import Authenticator from "./Authenticator.js";
declare class CertAuthenticator extends Authenticator {
    private origin;
    private url;
    private pfxPath;
    private pfxPassword;
    constructor(options: CertAuthenticatorType, browserInstanceName: any, baseUrl: string);
    login(): Promise<void>;
}
export default CertAuthenticator;
//# sourceMappingURL=CertAuthenticator.d.ts.map