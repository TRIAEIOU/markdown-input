import type {Handles} from 'micromark-util-types';

let contentSinceParagraph = 1;

/**
 * Micromark HTML extension to convert <p> to <br><br> in output
 */
const pToBrHtml: {enter: Handles, exit: Handles} = {
  enter: {
    paragraph: function () {
      // Figure out if not in list and no content blocks since last paragraph
      const tightStack = <boolean[]>this.getData('tightStack');
      if (!(<boolean[]>this.getData('tightStack')).length
        && !contentSinceParagraph)
          this.tag('<br><br>');
      // In list or content between
      else contentSinceParagraph = 1;
      // micromark implementation
      this.setData('slurpAllLineEndings');
    }
  },
  exit: {
    // Handle list items w/ reagrds to tight/loose
    paragraph: function () { 
        // Modified version of onexitparagraph()
        const tightStack = <boolean[]>this.getData('tightStack');
        // Not in list, setup for pot. paragraph run
        if (!tightStack.length) contentSinceParagraph = -1;
        // In list which is tight
        else if (tightStack[tightStack.length - 1])
          this.setData('slurpAllLineEndings', true);
        // In list which is loose
        else this.tag('<br><br>');
    },
    // Handle nested lists w/ regards to tight/loose
    listUnordered: function () { exitList.call(this, '</ul>'); },
    listOrdered: function () { exitList.call(this, '</ol>'); },
    content: function () { contentSinceParagraph++; }
  }
}

/** Close a list (copy of core implementation which is unaccessible)
 * with addition of adding a <br> if exiting nested list into a 
 * loose list
 */
function exitList(this: any, tag: string) {
    onexitlist.call(this, tag);

    // Only addition - if still in list which is loose, add <br>
    const tight = <boolean[]>this.getData('tightStack').pop();
    if (tight.length && !tight[tight.length - 1]) this.tag('<br>');
}

/** @type {Handle} */
// Copy of onexitlistordred/unordered()
function onexitlist(this: any, tag: string) {
  onexitlistitem.call(this);
  //this.getData('tightStack').pop(); // We do this ourselves to get result
  this.lineEndingIfNeeded();
  this.tag(tag);
}

/** @type {Handle} */
// Copy of onexitlistitem() (no handle exported)
function onexitlistitem(this: any) {
  if (this.getData('lastWasTag') && !this.getData('slurpAllLineEndings')) {
    this.lineEndingIfNeeded()
  }

  this.tag('</li>')
  this.setData('slurpAllLineEndings')
}

export {pToBrHtml};