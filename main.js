
/*! http://mths.be/fromcodepoint v0.1.0 by @mathias */
if (!String.fromCodePoint) {
  (function () {
    var defineProperty = (function () {
      // IE 8 only supports `Object.defineProperty` on DOM elements
      try {
        var object = {};
        var $defineProperty = Object.defineProperty;
        var result = $defineProperty(object, object, object) && $defineProperty;
      } catch (error) { }
      return result;
    }());
    var stringFromCharCode = String.fromCharCode;
    var floor = Math.floor;
    var fromCodePoint = function () {
      var MAX_SIZE = 0x4000;
      var codeUnits = [];
      var highSurrogate;
      var lowSurrogate;
      var index = -1;
      var length = arguments.length;
      if (!length) {
        return '';
      }
      var result = '';
      while (++index < length) {
        var codePoint = Number(arguments[index]);
        if (
          !isFinite(codePoint) ||       // `NaN`, `+Infinity`, or `-Infinity`
          codePoint < 0 ||              // not a valid Unicode code point
          codePoint > 0x10FFFF ||       // not a valid Unicode code point
          floor(codePoint) != codePoint // not an integer
        ) {
          throw RangeError('Invalid code point: ' + codePoint);
        }
        if (codePoint <= 0xFFFF) { // BMP code point
          codeUnits.push(codePoint);
        } else { // Astral code point; split in surrogate halves
          // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
          codePoint -= 0x10000;
          highSurrogate = (codePoint >> 10) + 0xD800;
          lowSurrogate = (codePoint % 0x400) + 0xDC00;
          codeUnits.push(highSurrogate, lowSurrogate);
        }
        if (index + 1 == length || codeUnits.length > MAX_SIZE) {
          result += stringFromCharCode.apply(null, codeUnits);
          codeUnits.length = 0;
        }
      }
      return result;
    };
    if (defineProperty) {
      defineProperty(String, 'fromCodePoint', {
        'value': fromCodePoint,
        'configurable': true,
        'writable': true
      });
    } else {
      String.fromCodePoint = fromCodePoint;
    }
  }());
}

(function () {
  var ew, ed, cc, maxc, endpos, trackingbox, trackpt;
  var LIMIT = 140;
  var hatted = false;
  var overflow = false;
  var isgsm = true;
  var trackpointpos = {};

  function validateGSMChar(value) {
    var reg = /[A-Za-z0-9 \\r\\n@£$¥èéùìòÇØøÅå\u0394_\u03A6\u0393\u0027\u0022\u039B\u03A9\u03A0\u03A8\u03A3\u0398\u039EÆæßÉ!\#$%&amp;()*+,\\./\-:;&lt;=&gt;?¡ÄÖÑÜ§¿äöñüà^{}\\\\\\[~\\]|\u20AC]*/;
    return reg.test(value);
  }

  function validateUSC2(value) {
    var test = value.split(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g);
    return !/[\uD800-\uDFFF]/.test(value);
  }

  function checkText(text) {
    var cleaned = '';
    if (!text) {
      isgsm = true;
      LIMIT = 140;
      //&nbsp; is inserted between words, cause.. browsers, chrome bug (this also is a bug in firefox)
      //https://bugs.chromium.org/p/chromium/issues/detail?id=310149
      text = ed.textContent.replace(/\u00A0/g, ' ');
    }
    console.log('checkText: ', text.length);
    for (var i = 0; i < text.length; i++) {
      var c = text.charAt(i);
      if (!validateGSMChar(c)) {
        var evil = text.charCodeAt(i);
        console.debug('offender is ', c, evil);
        isgsm = false;
        LIMIT = 70;
        return;
      }
    }
  }

  //http://stackoverflow.com/questions/4877326/how-can-i-tell-if-a-string-contains-multibyte-characters-in-javascript
  function surrogatePairToCodePoint(charCode1, charCode2) {
    return ((charCode1 & 0x3FF) << 10) + (charCode2 & 0x3FF) + 0x10000;
  }
  function cleanText(str) {

    // Read string in character by character and create an array of code points
    var codePoints = [], i = 0, charCode;

    while (i < str.length) {
      charCode = str.charCodeAt(i);
      if ((charCode & 0xF800) == 0xD800) {
        codePoints.push(surrogatePairToCodePoint(charCode, str.charCodeAt(++i)));
      } else {
        codePoints.push(charCode);
      }
      ++i;
    }
    var cleaned = '';
    console.log('codepoints ', codePoints);
    codePoints.forEach(function (c) {
      if (c <= 65535) {
        cleaned += String.fromCodePoint(c);
      }
    });
    return cleaned;
  }

  function fixedCharCodeAt(str, idx) {
    // ex. fixedCharCodeAt('\uD800\uDC00', 0); // 65536
    // ex. fixedCharCodeAt('\uD800\uDC00', 1); // false
    idx = idx || 0;
    var code = str.charCodeAt(idx);
    var hi, low;

    // High surrogate (could change last hex to 0xDB7F
    // to treat high private surrogates 
    // as single characters)
    if (0xD800 <= code && code <= 0xDBFF) {
      hi = code;
      low = str.charCodeAt(idx + 1);
      if (isNaN(low)) {
        throw 'High surrogate not followed by ' +
        'low surrogate in fixedCharCodeAt()';
      }
      return ((hi - 0xD800) * 0x400) +
        (low - 0xDC00) + 0x10000;
    }
    if (0xDC00 <= code && code <= 0xDFFF) { // Low surrogate
      // We return false to allow loops to skip
      // this iteration since should have already handled
      // high surrogate above in the previous iteration
      return false;
      // hi = str.charCodeAt(idx - 1);
      // low = code;
      // return ((hi - 0xD800) * 0x400) +
      //   (low - 0xDC00) + 0x10000;
    }
    return code;
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
      console.log('pasted text:', text.length);
      insertText(cp, text);
      updatecount();
      turnRed(pasted);
    });

    // ed.addEventListener('keydown', function (evnt) {
    //   if (evnt.keyCode && (evnt.keyCode == 8 || evnt.keyCode == 13)) {
    //     // updatecount();
    //     checkText();
    //     return;
    //   }
    //   if (evnt.key && evnt.key.toLocaleLowerCase() == 'backspace') {
    //     // updatecount();
    //     checkText();
    //     return;
    //   }
    // });
    ed.addEventListener('keyup', function (evnt) {
      if (evnt.keyCode && (evnt.keyCode == 8 || evnt.keyCode == 13)) {
        checkText();
        turnRed();
      }
      if (evnt.key && evnt.key.toLocaleLowerCase() == 'backspace') {
        checkText();
        turnRed();
      }
      updatecount();
    })
    ed.addEventListener('touchMove', adjustTrackHeight);
    ed.addEventListener('scroll', adjustTrackHeight);

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
    });

    var box = ed.getBoundingClientRect();
    trackingbox.style.zIndex = -1;
    trackingbox.style.position = 'absolute';
    trackingbox.style.overflow = 'hidden';
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
      n = redpill.firstChild;
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
      cleanNode(ed);
      var t = document.createTextNode(orgtxt);
      ed.appendChild(t);
      return;
    }
  }

  function setTrackpt() {
    var x = ed;
    x.value = ed.textContent;
    var coords = limitCoords();
    var box = ed.getBoundingClientRect();
    console.log('setTrackpt box: ', box);
    console.log('setTrackpt box: ', coords);
    var FUDGELEFT = 3;
    var FUDGETOP = 8;
    if (coords.top) {
      trackpointpos.top = coords.top - box.top + FUDGETOP;
      trackpointpos.left = coords.left - box.left - FUDGELEFT;
    } else {
      trackpointpos.top = box.top + FUDGETOP;
      trackpointpos.left = box.left - FUDGELEFT;
    }

    trackpointpos.scrolltop = 0;
    trackpt.style.top = trackpointpos.top + 'px';
    trackpt.style.left = trackpointpos.left + 'px';
    trackpt.style.visibility = 'visible';
  }
  function resetTracpt() {
    trackpt.style.visibility = 'hidden';
  }

  function adjustTrackHeight(evnt) {
    var h = evnt.target.scrollTop;
    var tpos = parseInt(trackpointpos.top);
    var npos = tpos;
    npos = (tpos - h);
    trackpointpos.scrolltop = h;
    trackpt.style.top = npos + 'px';
  }

  function turnRed(pasted) {
    var redpill = ed.getElementsByTagName('font')[0];
    var sel = window.getSelection();
    var edlength = ed.textContent.length;
    var cp, range;
    var t = adjustForSpaces();
    console.log("adjustedForSpaces: ", t);
    console.log('ed first check ', edlength);
    if (edlength < t) {
      resetTracpt();
      if (!redpill) {
        overflow = false;
        if (pasted === true) {
          cp = edlength;
          resetCursor(cp);
        }
        return;
      }
      cp = getCaretPosition(ed);
      if (pasted === true) {
        cp = edlength;
      }
      var rt = redpill.textContent;
      range = document.createRange();
      range.collapse(true);
      sel.removeAllRanges();
      wipe();
      range.setStart(ed.firstChild, cp);
      sel.addRange(range);
      return;
    }
    cp = getCaretPosition(ed);
    console.log('cursor pos: ', cp);
    console.log('edlength: ', edlength);
    if (cp === edlength) {
      if (!overflow) {
        console.log("cp == edlength");
        overflow = true;
        document.execCommand('foreColor', null, '#999999');
        setTimeout(setTrackpt, 100); //todo: maybe recurisve till font tag exists... maybe
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
    range = document.createRange();
    range.collapse(true);
    sel.removeAllRanges();

    range.setStart(tnode, pos);
    range.setEnd(tnode, edlength);
    sel.addRange(range);

    document.execCommand('foreColor', null, '#999999');

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

  function limitCoords() {
    var fnode = ed.getElementsByTagName('font')[0];
    if (!fnode) {
      console.log('limitCoords why you no have box');
      return {};
    }
    var box = { top: fnode.offsetTop, left: fnode.offsetLeft };
    return box;
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
    // if (s.trimLeft) {
    //   endpos = s.trimLeft().length;
    // } else {
    //   var sleft = s.replace(/^[\s\t]+/, '');
    //   endpos = sleft.length;
    // }
    endpos = s.length;
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

}());