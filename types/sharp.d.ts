/**
 * Sharp 0.35 ships declarations but omits the `types` condition from its
 * package export map. Remove this bridge when Sharp exports its bundled types.
 */
declare module "sharp" {
  import sharp = require("../node_modules/sharp/lib/index");
  export = sharp;
}
