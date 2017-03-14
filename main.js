(function () {
  var ew, ed, cc, maxc, endpos, trackingbox, trackpt;
  var LIMIT = 140;
  var hatted = false;
  var overflow = false;
  var isgsm = true;


  function validateGSMChar(value) {
    var reg = /[A-Za-z0-9 \\r\\n@£$¥èéùìòÇØøÅå\u0394_\u03A6\u0393\u0027\u0022\u039B\u03A9\u03A0\u03A8\u03A3\u0398\u039EÆæßÉ!\#$%&amp;()*+,\\./\-:;&lt;=&gt;?¡ÄÖÑÜ§¿äöñüà^{}\\\\\\[~\\]|\u20AC]*/;
    return reg.test(value);
  }

  function validateUSC2(value) {
    var test = value.split(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g);
    console.log('validateUSC2', test);
    return !/[\uD800-\uDFFF]/.test(value);
  }

  function checkText(text) {
    var cleaned = '';
    if (!text) {
      isgsm = true;
      LIMIT = 140;
      text = ed.textContent;
    }
    for (var i = 0; i < text.length; i++) {
      var c = text.charAt(i);
      console.log('chekc text', c);
      if (!validateGSMChar(c)) {
        var evil = text.charCodeAt(i);
        console.log('offender is ', c, evil);
        isgsm = false;
        LIMIT = 70;
        return;
      }
    }

  }

  // //http://stackoverflow.com/questions/4877326/how-can-i-tell-if-a-string-contains-multibyte-characters-in-javascript
  // function surrogatePairToCodePoint(charCode1, charCode2) {
  //   return ((charCode1 & 0x3FF) << 10) + (charCode2 & 0x3FF) + 0x10000;
  // }
  // function XXcleanText(str){

  //   // Read string in character by character and create an array of code points
  //   var codePoints = [], i = 0, charCode;
    
  //   while (i < str.length) {
  //     charCode = str.charCodeAt(i);
  //     if ((charCode & 0xF800) == 0xD800) {
  //       codePoints.push(surrogatePairToCodePoint(charCode, str.charCodeAt(++i)));
  //     } else {
  //       codePoints.push(charCode);
  //     }
  //     ++i;
  //   }
  //   var cleaned = '';
  //   console.log('codepoints ', codePoints);
  //   codePoints.forEach(function(c){
  //     if(c <= 65535){
  //       cleaned += String.fromCodePoint(c);
  //     }
  //   });
  //   return cleaned;
  // }

  function cleanText(text){
    var cleaned = '';
    //does not work in IE/Safari, need alt solutions
    for(var v of text){
      if(v.length == 1){
        cleaned += v;
      }
    }
    checkText(cleaned);
    return cleaned;

  }

  function insertText(cp, text) {
    var cleaned = cleanText(text);
    if (cp == ed.textContent.length) {
      ed.textContent = ed.textContent + cleaned + ' ';
      return;
    }
    var t = ed.textContent;
    var newt = '';
    for (var i = 0; i < t.length; i++) {
      if (i == cp) {
        newt += cleaned;
      } else {
        newt += t.charAt(i);
      }
    }
    ed.textContent = newt;
  }

  function setup() {
    ed = document.getElementById('editor-main');
    cc = document.getElementById('current-count');
    maxc = document.getElementById('limit');
    trackingbox = document.getElementById('tracking-box');
    trackpt = document.getElementById('tracking-point');

    endpos = 0;

    maxc.textContent = LIMIT;

    ed.addEventListener('paste', function (evnt) {
      console.log(evnt);
      evnt.preventDefault();
      var cp = getCaretPosition(ed);
      var pasted = (cp == ed.textContent.length);
      var clip = evnt.clipboardData || window.clipboardData;
      var text = clip.getData('text');
      insertText(cp, text);
      updatecount();
      turnRed(pasted);
    });

    ed.addEventListener('keydown', function (evnt) {
      if (evnt.keyCode && (evnt.keyCode == 8 || evnt.keyCode == 13)) {
        updatecount();
        checkText();
        return;
      }
      if (evnt.key && evnt.key.toLocaleLowerCase() == 'backspace') {
        updatecount();
        checkText();
        return;
      }
    });
    ed.addEventListener('keyup', function (evnt) {
      if (evnt.keyCode && (evnt.keyCode == 8 || evnt.keyCode == 13)) {
        turnRed();
        updatecount();
      }
    })
    ed.addEventListener('keypress', function (evnt) {
      if (evnt.ctrlKey || evnt.metaKey || evnt.keyCode == 20 || (evnt.keyCode > 36 && evnt.keyCode < 41) || (evnt.keyCode == 8 || evnt.keyCode == 13)) {
        return;
      }
      var char = evnt.keyCode || evnt.which;
      var str = String.fromCharCode(char);
      if (!validateUSC2(str)) {
        console.log('not valid USC-2');
        evnt.stopPropagation();
        evnt.preventDefault();
        return;
      }
      checkText(str);
      turnRed();
      updatecount();
    });

    var box = ed.getBoundingClientRect();
    trackingbox.style.zIndex = -1;
    trackingbox.style.position = 'absolute';
    trackingbox.style.top = box.top + 'px';
    trackingbox.style.left = box.left + 'px';
    trackingbox.style.width = box.width + 'px';
    trackingbox.style.height = box.height + 'px';

  }

  function stopPosSet(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function adjustForSpaces() {
    var tnode = ed.firstChild;
    if (!tnode) {
      return LIMIT;
    }
    var redtext = tnode.textContent;
    //ie does not have trimleft cause it sucks
    var adjusted = redtext.substring(-1, LIMIT).trim();
    var base = LIMIT - adjusted.length;
    console.log('base ', base);
    return LIMIT + base;
  }

  function resetCursor(cp) {
    var sel = window.getSelection();
    sel.removeAllRanges();
    var range = document.createRange();
    var n = ed.firstChild;
    var pos = cp;
    if (cp > n.textContent.length) {
      var redpill = ed.children.item(0);
      n = redpill.firstChild.firstChild; //font/i
      var leftovers = ed.textContent.length - cp;
      console.log('leftovers ', leftovers);
      pos = n.textContent.length - leftovers;
    }
    range.setStart(n, pos);
    sel.addRange(range);
  }

  function cleanNode(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function wipe() {
    if (ed.children.length > 0) {
      var orgtxt = ed.textContent;
      console.log('wipe ', orgtxt);
      console.log('wipe length ', orgtxt.length);
      cleanNode(ed);
      var t = document.createTextNode(orgtxt);
      ed.appendChild(t);
      return;
    }
  }

  function setTrackpt(){
    var x = ed;
    x.value = ed.textContent;
    var coords = getCaretCoordinates(x);
    trackpt.style.top = coords.top + 8 +'px';
    trackpt.style.left = coords.left + 'px';
    trackpt.style.visibility = 'visible';
  }
    

  function turnRed(pasted) {
    var redpill = ed.getElementsByTagName('font')[0];
    var sel = window.getSelection();
    var edlength = ed.textContent.length;

    if (edlength < adjustForSpaces()) {
      if (!redpill) {
        overflow = false;
        if (pasted === true) {
          cp = edlength;
          resetCursor(cp);
        }
        return;
      }
      var cp = getCaretPosition(ed);
      if (pasted === true) {
        cp = edlength;
      }
      var rt = redpill.textContent;
      var range = document.createRange();
      range.collapse(true);
      sel.removeAllRanges();
      wipe();
      range.setStart(ed.firstChild, cp);
      sel.addRange(range);
      return;
    }
    var cp = getCaretPosition(ed);
    console.log(cp);
    if (cp === edlength) {
      if (!overflow) {
        overflow = true;
        document.execCommand('foreColor', null, 'red');
        document.execCommand('italic');
        setTrackpt();
      }
      return;
    }
    if (pasted === true) {
      cp = edlength;
      console.log('pasted ', cp);
      overflow = false;
    }

    wipe();
    var tnode = ed.firstChild;
    var normaltext = tnode.textContent;
    var pos = adjustForSpaces();
    var range = document.createRange();
    range.collapse(true);
    sel.removeAllRanges();

    range.setStart(tnode, pos);
    range.setEnd(tnode, edlength);
    console.log(range);
    sel.addRange(range);

    document.execCommand('foreColor', null, 'red');
    document.execCommand('italic');

    resetCursor(cp);
    setTrackpt();
  }

  function selectDivFocus(div, atend) {
    var tnode = div.firstChild;
    var range = document.createRange();
    var sel = window.getSelection();
    range.collapse(true);
    sel.removeAllRanges();
    if (atend === true) {
      range.setStart(tnode, tnode.length);
    } else {
      range.selectNode(div);
    }
    sel.addRange(range);
    div.focus();
  }

  function getCaretPosition(element) {
    var caretOffset = 0;
    var doc = element.ownerDocument || element.document;
    var win = doc.defaultView || doc.parentWindow;
    var sel;
    if (typeof win.getSelection != "undefined") {
      sel = win.getSelection();
      if (sel.rangeCount > 0) {
        var range = win.getSelection().getRangeAt(0);
        var preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        caretOffset = preCaretRange.toString().length;
      }
    } else if ((sel = doc.selection) && sel.type != "Control") {
      var textRange = sel.createRange();
      var preCaretTextRange = doc.body.createTextRange();
      preCaretTextRange.moveToElementText(element);
      preCaretTextRange.setEndPoint("EndToEnd", textRange);
      caretOffset = preCaretTextRange.text.length;
    }
    return caretOffset;
  }

  function updatecount() {
    var s = ed.textContent;
    if (s.trimLeft) {
      endpos = s.trimLeft().length;
    } else {
      var sleft = s.replace(/^[\s\t]+/, '');
      endpos = sleft.length;
    }
    cc.textContent = endpos;
    maxc.textContent = LIMIT;
    if (endpos > LIMIT) {
      cc.style.color = 'red';
    } else {
      cc.style.color = 'black';
    }
  }

  function init() {
    setup();
    updatecount();
  }


  this.updatecount = updatecount;
  this.init = init;
  window.validatingbox = this;

  document.addEventListener('DOMContentLoaded', function () {
    validatingbox.init();
  });

  //https://github.com/component/textarea-caret-position/blob/master/index.js

// The properties that we copy into a mirrored div.
// Note that some browsers, such as Firefox,
// do not concatenate properties, i.e. padding-top, bottom etc. -> padding,
// so we have to do every single property specifically.
var properties = [
  'direction',  // RTL support
  'boxSizing',
  'width',  // on Chrome and IE, exclude the scrollbar, so the mirror div wraps exactly as the textarea does
  'height',
  'overflowX',
  'overflowY',  // copy the scrollbar for IE

  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',

  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',

  // https://developer.mozilla.org/en-US/docs/Web/CSS/font
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',

  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',  // might not make a difference, but better be safe

  'letterSpacing',
  'wordSpacing',

  'tabSize',
  'MozTabSize'

];

var isBrowser = (typeof window !== 'undefined');
var isFirefox = (isBrowser && window.mozInnerScreenX != null);

function getCaretCoordinates(element, options) {
  if(!isBrowser) {
    throw new Error('textarea-caret-position#getCaretCoordinates should only be called in a browser');
  }

  var debug = options && options.debug || false;
  if (debug) {
    var el = document.querySelector('#input-textarea-caret-position-mirror-div');
    if ( el ) { el.parentNode.removeChild(el); }
  }

  // mirrored div
  var div = document.createElement('div');
  div.id = 'input-textarea-caret-position-mirror-div';
  document.body.appendChild(div);

  var style = div.style;
  var computed = window.getComputedStyle? getComputedStyle(element) : element.currentStyle;  // currentStyle for IE < 9

  // default textarea styles
  style.whiteSpace = 'pre-wrap';
  if (element.nodeName !== 'INPUT')
    style.wordWrap = 'break-word';  // only for textarea-s

  // position off-screen
  style.position = 'absolute';  // required to return coordinates properly
  if (!debug)
    style.visibility = 'hidden';  // not 'display: none' because we want rendering

  // transfer the element's properties to the div
  properties.forEach(function (prop) {
    style[prop] = computed[prop];
  });

  if (isFirefox) {
    // Firefox lies about the overflow property for textareas: https://bugzilla.mozilla.org/show_bug.cgi?id=984275
    if (element.scrollHeight > parseInt(computed.height))
      style.overflowY = 'scroll';
  } else {
    style.overflow = 'hidden';  // for Chrome to not render a scrollbar; IE keeps overflowY = 'scroll'
  }

  div.textContent = element.value.substring(0, LIMIT);
  // the second special handling for input type="text" vs textarea: spaces need to be replaced with non-breaking spaces - http://stackoverflow.com/a/13402035/1269037
  if (element.nodeName === 'INPUT')
    div.textContent = div.textContent.replace(/\s/g, '\u00a0');

  var span = document.createElement('span');
  // Wrapping must be replicated *exactly*, including when a long word gets
  // onto the next line, with whitespace at the end of the line before (#7).
  // The  *only* reliable way to do that is to copy the *entire* rest of the
  // textarea's content into the <span> created at the caret position.
  // for inputs, just '.' would be enough, but why bother?
  span.textContent = element.value.substring(LIMIT) || '.';  // || because a completely empty faux span doesn't render at all
  div.appendChild(span);

  var coordinates = {
    top: span.offsetTop + parseInt(computed['borderTopWidth']),
    left: span.offsetLeft + parseInt(computed['borderLeftWidth'])
  };

  if (debug) {
    span.style.backgroundColor = '#aaa';
  } else {
    document.body.removeChild(div);
  }

  return coordinates;
}

}());