/**
 * makemarkdown render <hr> as ***
 */
 (function (extension) {
    'use strict';
    // Boiler plate loader code
    if (typeof showdown !== 'undefined') {
      extension(showdown);
    } else if (typeof define === 'function' && define.amd) {
      define(['showdown'], extension);
    } else if (typeof exports === 'object') {
      module.exports = extension(require('showdown'));
    } else {
      throw Error('Could not find showdown library');
    }
  }(function (showdown) {
    'use strict';
  
    // Implement and register
    showdown.extension('asteriskHr', function() {
      'use strict';
      return {
        type: 'listener',
        listeners: {
          "makeMarkdown.hr.onEnd": (evt) => {
            return '**********************************************';
          }
        }
      };
    });
  }));