(function () {
  var ew, ed, cc, maxc, endpos;
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

  //http://stackoverflow.com/questions/4877326/how-can-i-tell-if-a-string-contains-multibyte-characters-in-javascript
  function surrogatePairToCodePoint(charCode1, charCode2) {
    return ((charCode1 & 0x3FF) << 10) + (charCode2 & 0x3FF) + 0x10000;
  }
  function cleanText(str){

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
    codePoints.forEach(function(c){
      if(c <= 65535){
        cleaned += String.fromCodePoint(c);
      }
    });
    return cleaned;
  }

  function insertText(cp, text) {
    var cleaned = cleanText(text);
    if (cp == ed.textContent.length) {
      ed.textContent = ed.textContent + cleanText(text) + ' ';
      return;
    }
    var t = ed.textContent;
    var newt = '';
    for (var i = 0; i < t.length; i++) {
      if (i < cp) {
        newt += t.charAt(i);
      } else {
        newt += text;
      }
    }
    ed.textContent = newt;
  }

  function setup() {
    ed = document.getElementById('editor-main');
    cc = document.getElementById('current-count');
    maxc = document.getElementById('limit');

    endpos = 0;

    maxc.textContent = LIMIT;

    ed.addEventListener('paste', function (evnt) {
      console.log(evnt);
      evnt.preventDefault();
      var cp = getCaretPosition(ed);
      var pasted = (cp == ed.textContent.length);
      var clip = evnt.clipboardData || window.clipboardData;
      var text = clip.getData('text');
      checkText(text);
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
      console.log(evnt);
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
      var tl = ed.textContent.length;
      turnRed();
      // if(tl > adjustForSpaces() && overflow === false){
      //   genHat();
      // }else{
      //   // overflow = false;
      // }
      updatecount();
    });
  }

  function stopPosSet(event) {
    event.preventDefault();
    event.stopPropagation();
  }
  function genHat() {
    return;
    if (hatted === true) {
      return;
    }
    // var range = document.createRange();
    var sel = window.getSelection();
    var range = sel.getRangeAt(0);
    range.insertNode(document.createTextNode('^'));
    document.execCommand('subscript');
    hatted = true;
    // range.collapse(true);
    // sel.removeAllRanges();

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
  })
}());