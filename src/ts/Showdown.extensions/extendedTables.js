 /*******************************************************************
 * Extend makehtml and makemarkdown tables to allow headerless tables
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

  /*********************************************************************
   * Parse markdown table to html. Enclose all related functions to avoid
   * naming confusion
   * @param {Event} evt evt: Recieved Event object
   * @return {Event} Event object with final output
   */
  function markdownTableToHtml(evt) {
    /***********************************************************************
     * Regexes for different table versions
     */
    let patterns = [
      { // Table with header and alignment, multiple columns
        pattern: /^ {0,3}\|?.+\|.+\n {0,3}\|?[ \t]*:?[ \t]*[-=]{2,}[ \t]*:?[ \t]*\|[ \t]*:?[ \t]*[-=]{2,}[\s\S]+?(?:\n\n|¨0)/gm,
        head: true,
        align: true
      },
      { // Table with header and alignment, single column
        pattern: new RegExp(/^ {0,3}\|.+\|[ \t]*\n {0,3}\|[ \t]*:?[ \t]*[-=]{2,}[ \t]*:?[ \t]*\|[ \t]*\n( {0,3}\|.+\|[ \t]*\n)*(?:\n|¨0)/gm),
        head: true,
        align: true
      },
      { // Table w/o header but with alignemnt, multiple columns
        pattern: /^ {0,3}\|?[ \t]*:?[ \t]*(?:[-=]){2,}[ \t]*:?[ \t]*\|[ \t]*:?[ \t]*(?:[-=]){2,}[\s\S]+?(?:\n\n|¨0)/gm,
        head: false,
        align: true
      },
      { // Table w/o header but with alignment, single column
        pattern: /^ {0,3}\|[ \t]*:?[ \t]*(?:[-=]){2,}[ \t]*:?[ \t]*\|[ \t]*\n( {0,3}\|.+\|[ \t]*\n)*(?:\n|¨0)/gm,
        head: false,
        align: true
      },
      { // Table w/o header and alignment, multiple columns
        pattern: /^ {0,3}\|?.+\|.+\n {0,3}\|?.+\|[\s\S]*?(?:\n\n|¨0)/gm,
        head: false,
        align: false
      }/*,
      { // Table w/o header and alignment, single column
        pattern: /^ {0,3}\|[\s\S]+?\|[ \t]*\n*(?:\n|¨0)/gm,
        head: false,
        align: false
      }*/
    ];

    /***********************************************************************
     * Data structure to keep all data of table being manipulated
     */
    class TableData {
      constructor(tableRegExp = {}, input = "", showdown = {options: {}, globals: {}}) {
          this.tableRegExp = tableRegExp; // pattern object {pattern: string, head: boolean, align: boolean}
          this.input = input; // The text that matched the table pattern
          this.showdown = showdown; // Ugly hack to make options and globals available
          this.output = ""; // The text to replace input
          this.headers = []; // Array of the headers (if any)
          this.styles = []; // Array of the styles (if any)
          this.cells = []; // Array of rows of array of cells
          this.attributes = {}; // Hash of table level attributes
      }
    }

    /***********************************************************************
     * Verify, sanitize and preprocess (code spans) markdown table input
     * @param {TableData} table table: TableData object
     * @returns {boolean} preParseTable successful
     */
    function preParseTable(table) {
      // Parse out and sanitize all rows
      let rows = table.input.split('\n').map((row, i) => {
        // strip | wrapped tables
        row = row.replace(/^(?:[ ]{0,3}\|)?(.*?)(?:\|[ \t]*)?$/, '$1');
        // Replace inline <br>s
        const newline = evt.converter.getOption('tableNewline');
        if (newline) {
          const sd_chars = {
            '¨': '¨T',
            '$': '¨D'
          }
          const BR_PATTERN = new RegExp(String.raw`(?<!\\)((?:\\\\)*)${sd_chars[newline] || newline}`, 'g');
          row = row.replace(BR_PATTERN, '$1<br>');
        }
        // parse code spans first, but we only support one line code spans
        return showdown.subParser('makehtml.codeSpan')(row, table.showdown.options, table.showdown.globals);
      });

      let colN = 0; // Find largest num of cols in headers or cells

      // Parse and sanitize headers if appropriate
      if (table.tableRegExp.head) {
        table.headers = rows.shift().split('|').map(function (s) {
          return s.trim();
        });
        if (!table.headers) { return false; }
        colN = table.headers.length;
      } else { table.headers = []; }

      // Parse and sanitize styles if appropriate
      if (table.tableRegExp.align) {
        table.styles = rows.shift().split('|').map(function (s) {
          return s.trim();
        });
        if (!table.styles) { return false; }
      } else { table.styles = []; }

      // Parse and sanitize cells
      for (let i = 0; i < rows.length; ++i) {
        if (rows[i].trim() !== '') {
          let cells = rows[i].split('|').map(function (s) {
            return s.trim();
          });
          if (cells.length > colN) { colN = cells.length; }        
          table.cells.push(cells);
        }
      }
      if (!table.cells && !table.headers) { return false; }

      // Pad styles to max cols - styles is only array indexed from others
      while (table.styles.length < colN) { table.styles.push(''); }

      return true;
    }
  
    /***********************************************************************
     * Parse markdown table into TableData structure
     * @param {TableData} table table: TableData object
     * @returns {boolean} parsing successful
     */
    function parseTable(table) {

      if(!parseStyles(table)) {
        return false;
      }

      table.headers = table.headers.map((hdr, i) => {
        hdr = showdown.subParser('makehtml.spanGamut')(hdr.trim(), table.showdown.options, table.showdown.globals);
        if (table.showdown.options.tablesHeaderId) {
          table.styles[i].id = hdr.replace(/ /g, '_').toLowerCase();
        }
        return '<th' + showdown.helper._populateAttributes(table.styles[i]) + '>' + hdr + '</th>\n';
      })

      table.cells = table.cells.map((row, i) => {
        return row.map((cell, ii) => {
          let attr = table.styles[ii];
          // Reusing attributes, remove id previously set for headers
          if (table.showdown.options.tablesHeaderId && attr.id) {
            attr.classes = [attr.id] + '_col';
            delete attr.id;
          }
          cell = showdown.subParser('makehtml.spanGamut')(cell, table.showdown.options, table.showdown.globals);
          return '<td' + showdown.helper._populateAttributes(attr) + '>' + cell + '</td>\n';
        });
      });

      return true;
    }

    /***********************************************************************
     * Parse markdown table styles into TableData structure
     * @param {TableData} table table: TableData object
     * @returns {boolean} parsing successful
     */
    function parseStyles(table) {
      table.styles = table.styles.map((stl) => {
        if (/^:[ \t]*-+$/.test(stl)) {
          return { style: 'text-align:left;' };
        } else if (/^-+[ \t]*:[ \t]*$/.test(stl)) {
          return { style: 'text-align:right;' };
        } else if (/^:[ \t]*-+[ \t]*:$/.test(stl)) {
          return { style: 'text-align:center;' };
        } else {
          return {};
        }  
      });

      return true;
    }

    /***********************************************************************
     * Build HTML from TableData object
     * @param {TableData} table table: TableData object
     * @returns {boolean} Table built successful
     */
    function buildTable(table) {
      table.output = '<table' + showdown.helper._populateAttributes(table.attributes) + '>\n';

      if (table.tableRegExp.head) {
        table.output += '<thead>\n<tr>\n';
        table.headers.forEach(hdr => {
          table.output += hdr
        });
        table.output += '</tr>\n</thead>\n';
      }

      table.output += '<tbody>\n';

      table.cells.forEach(row => {
        table.output += '<tr>\n' + row.join('') + '</tr>\n';
      });

      table.output += '</tbody>\n</table>\n';
      return true;
    }



    /*******************************************************************
     * HTML to markdown
     */
    let txt = evt.input;
    patterns.forEach(re => {
      txt = txt.replace(re.pattern, function (match) {
        let table = new TableData(re, match, {options: evt.options, globals: evt.globals});

          // Invalid table format
          if (!preParseTable(table)) {
            return match;
          }
    
          // Error in deep table parsing
          if (!parseTable(table)) {
            return match;
          }
    
          // Error building table
          if (!buildTable(table)) {
            return match;
          }
    
          return table.output;
        });
    });

    return txt;
  }

  /*********************************************************************
   * Parse html table to markdown. Enclose all related functions to avoid
   * naming confusion
   * @param {Event} evt evt: Recieved Event object
   * @return {Event} Event object with final output
   */
  function htmlTableToMarkdown(evt) {
    'use strict';
    const newline = evt.converter.getOption('tableNewline') || '';
    let rows = Array.from(evt.node.querySelectorAll('tr'));
    // Parse header row (first row if thead child or contains at least one th)
    let headings = [], aligns = [], colWidths = [];
    if (rows[0].parentElement.tagName === 'THEAD' ||
      rows[0].querySelectorAll('th').length > 0) {
        let head = rows.shift();
        head.querySelectorAll('td, th').forEach(cell => {
          let valids = ['left', 'right', 'center'];
          let n = valids.indexOf(cell.style.textAlign);
          if (n === -1) {
            aligns.push('none')
          } else {
            aligns.push(valids[n]);
          }
          let txt = showdown.subParser('makeMarkdown.tableCell')(cell, evt.globals).trim();
          if (newline) txt = txt.replace(/[ ]*\n/g, newline);
          colWidths.push(Math.max(txt.length, 3));
          headings.push(txt);
        });
    }
    if (!(rows.length || headings.length)) {
      evt.output = null;
      return evt;
    }

    // Expand remaining rows and parse content
    let cols = headings.length;
    rows = rows.map((row, i) => {
      let cells = Array.from(row.querySelectorAll('td, th'));
      // Take len of first row if no headings
      if (!cols) {
        cols = cells.length;
        colWidths = Array(cols).fill(3);
      }
      
      // Parse cell contents, storing width if col max
      cells = cells.map((cell, i) => {
        let txt = showdown.subParser('makeMarkdown.tableCell')(cell, evt.globals).trim();
        if (txt.length > colWidths[i]) { colWidths[i] = txt.length; }
        if (newline) txt = txt.replace(/[ ]*\n/g, newline);
        return txt;
      });

      // Expand rows that are too "short"
      if (cells.length < cols) {
        cells.push(...Array(cols - cells.length).fill(' '));
      }
      return cells;
    });

    // Pad cells and join rows
    let txt = '';
    rows.forEach(row => {
      txt += '|';
      row.forEach((cell, i) => {
        txt += ' ';
        let align = headings.length ? aligns[i] : 'none';
        if(align === 'right') {
          txt += cell.padStart(colWidths[i], ' ');
        } else if (align === 'center') {
          let l = Math.round(colWidths[i] / 2);
          txt += cell.padStart(l, ' ').padEnd(colWidths[i] - l, ' ');
        } else {
          txt += cell.padEnd(colWidths[i], ' ');
        }
        txt += ' |';
      });
      txt += '\n';
    });

    // Pad header and alignment rows
    if (headings.length) {
      let thead = '|', talign = '|';
      headings = headings.map((cell, i) => {
        thead += ' ', talign += ' ';
        if(aligns[i] === 'right') {
          thead += cell.padStart(colWidths[i], ' ');
          talign += '-'.repeat(colWidths[i] - 1) + ':';
        } else if (aligns[i] === 'center') {
          let l = Math.round(colWidths[i] / 2);
          thead += cell.padStart(l, ' ').padEnd(colWidths[i] - l, ' ');
          talign += ':' + '-'.repeat(colWidths[i] - 2) + ':';
        } else {
          thead += cell.padEnd(colWidths[i], ' ');
          talign += '-'.repeat(colWidths[i]);
        }
        thead += ' |', talign += ' |';
      });
      txt = thead + '\n' + talign + '\n' + txt;
    }

    return txt.trim();
  }

  /*******************************************************************
   * Register extension
   */
  showdown.extension('extendedTables', function () {
    'use strict';
    return {
      type: 'listener',
      listeners: {
        "makehtml.table.onStart": markdownTableToHtml,
        "makeMarkdown.table.onEnd": htmlTableToMarkdown
      }
    };
  });
}));