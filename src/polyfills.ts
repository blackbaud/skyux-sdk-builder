/* IE9, IE10 and IE11 requires all of the following polyfills. */
import 'core-js/es/symbol';
import 'core-js/es/object';
import 'core-js/es/function';
import 'core-js/es/parse-int';
import 'core-js/es/parse-float';
import 'core-js/es/number';
import 'core-js/es/math';
import 'core-js/es/string';
import 'core-js/es/date';
import 'core-js/es/array';
import 'core-js/es/regexp';
import 'core-js/es/map';
import 'core-js/es/weak-map';
import 'core-js/es/set';

/* Add support for SVG `.contains` method in IE11. */
if (!SVGElement.prototype.contains) {
  SVGElement.prototype.contains = HTMLDivElement.prototype.contains;
}

/* IE10 and IE11 requires the following for the Reflect API. */
import 'core-js/es/reflect';

/* Evergreen browsers require these. */
// Used for reflect-metadata in JIT. If you use AOT (and only Angular decorators), you can remove.
import 'core-js/proposals/reflect-metadata';

/**
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js/dist/zone';
