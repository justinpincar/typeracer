$(function() {
  window.typeracer = {};

  $.fn.getCursorPosition = function() {
    var input = this.get(0);
    if (!input) return; // No (input) element found
    if ('selectionStart' in input) {
      // Standard-compliant browsers
      return input.selectionStart;
    } else if (document.selection) {
      // IE
      input.focus();
      var sel = document.selection.createRange();
      var selLen = document.selection.createRange().text.length;
      sel.moveStart('character', -input.value.length);
      return sel.text.length - selLen;
    }
  }

  function initGame() {
    generateTextDiv();
    generateMap();

    typeracer.words_complete = 0;
    typeracer.text_position = 0;
    setNextCharacter();

    typeracer.socket = io.connect('http://localhost', {
      'force new connection': true,
      'reconnect': true,
      'reconnection delay': 500,
      'max reconnection attempts': 10
    });

    typeracer.socket.on('connect', function () {
      var nickname = getRandomName();
      typeracer.socket.emit('user_join', {nickname: nickname});
    });
    typeracer.socket.on('user_join', function(user) {
      typeracer.addPlayer(user);
    });

    $('#playerReady').click(function() {
      $('#playerReady').hide();
      typeracer.socket.emit('player_ready');
      playerReady(typeracer.user);
    });
  };

  function playerReady(user) {
    move(user, 2, 0);
    startRace();
  };

  typeracer.addPlayer = function(player) {
    var y = typeracer.players.length * 3;
    typeracer.players.push(player);

    drawTile("W", 0, y);
    drawTile("W", 1, y);
    drawTile("W", 0, y+1);
    drawTile("G", 1, y+1);
    drawTile("W", 0, y+2);
    drawTile("W", 1, y+2);
    for (var ix=2; ix<typeracer.tokens.length+5; ix++) {
      drawTile("W", ix, y);
    }
    drawTile("W", 2, y+1);
    for (var ix=3; ix<typeracer.tokens.length+4; ix++) {
      drawTile("G", ix, y+1);
    }
    drawTile("S", typeracer.tokens.length+3, y+1);
    drawTile("W", typeracer.tokens.length+4, y+1);
    for (var ix=2; ix<typeracer.tokens.length+5; ix++) {
      drawTile("W", ix, y+2);
    }
    var gate = drawTile("R", 4, y+1);
    typeracer.starting_gates.push(gate);

    drawUser(1, y+1);
  }

  function startRace() {
    $('#debug').text("Ready...");
    setTimeout(function() {
      $('#debug').text("Set...");
      setTimeout(function() {
        $('#debug').text("Go!");
        removeStartingGates();
        updateScreen();
        $('#text_type').removeAttr('disabled');
        $('#text_type').focus();
        typeracer.start = Date.now();
      }, 1000);
    }, 1000);
  };

  function removeStartingGates() {
    var gates = typeracer.starting_gates;
    console.log(gates.length);
    for (var i=0; i<gates.length; i++) {
      var gate = gates[i];
      gate.hide();
    }
  };

  var block_index = Math.floor(Math.random() * blocks.length);
  typeracer.block = blocks[block_index];

  function generateTextDiv() {
    typeracer.tokens = typeracer.block.split(" ");
    for (var i=0; i<typeracer.tokens.length; i++) {
      var token = typeracer.tokens[i];
      var span = $("<span class='word-" + i + "'>" + token + "</span>");
      $('#text_content').append(span);
    }
  };

  function generateMap() {
    typeracer.starting_gates = [];

    typeracer.stage = new Kinetic.Stage({
      container: "container",
      width: 960,
      height: 600
    });

    typeracer.player = {}
    typeracer.layer = new Kinetic.Layer();

    typeracer.users = [];
    typeracer.players = [];
    typeracer.addPlayer(typeracer.player);
    typeracer.user = typeracer.users[0];

    typeracer.stage.add(typeracer.layer);

    typeracer.stage.onFrame(function(frame){
      typeracer.stage.draw();
    });
    typeracer.stage.start();
  };

  function setNextCharacter() {
    typeracer.next_character = typeracer.block.charAt(typeracer.text_position);
  };

  function updateScreen() {
    if (typeracer.words_complete > 0) {
      var last_span_class = "word-" + (typeracer.words_complete - 1);
      var last_span = $('.' + last_span_class);
      last_span.removeClass('current');
      last_span.removeClass('error');

    };

    var current_span_class = "word-" + typeracer.words_complete;
    var current_span = $('.' + current_span_class);
    current_span.addClass('current');
    if (typeracer.statusError) {
      current_span.addClass('error');
    } else {
      current_span.removeClass('error');
    }
  }

  function updateDebug() {
    var wpm = typeracer.words_complete / ((Date.now() - typeracer.start) / (60000));

    var html =
      "<br /><Br />Text position: " + typeracer.text_position +
      "<br /><br />Next character: " + typeracer.next_character +
      "<br /><br />Just typed: " + typeracer.just_typed +
      "<br /><br />Words complete: " + typeracer.words_complete +
      "<br /><br />WPM: " + wpm;
    $('#debug').html(html);
  }

  $(document).bind('keyup keydown', function(e){
    typeracer.shifted = e.shiftKey;
  });

  $('#text_type').keydown(function(e) {
    // Shift key or backspace key
    if (e.keyCode == 16 || e.keyCode == 8) {
      return;
    }

    var cursor_position = $('#text_type').getCursorPosition();
    if (cursor_position != typeracer.text_position) {
      return;
    }

    var key_code = e.keyCode;
    console.log("Before code: " + key_code);

    if (key_code >= 65 && key_code <= 90) {
      if (!typeracer.shifted) {
        key_code += 32;
      }
    } else {
      var unshifted_key_map = {
        186: 59,
        188: 44,
        189: 45,
        190: 46,
        222: 39
      }
      var shifted_key_map = {
        48: 41,
        49: 33,
        57: 40,
        186: 58,
        191: 63,
        222: 34
      }

      var map;
      if (typeracer.shifted) {
        map = shifted_key_map;
      } else {
        map = unshifted_key_map;
      }

      if (key_code in map) {
        key_code = map[key_code];
      }
    }

    var character = String.fromCharCode(key_code);
    typeracer.just_typed = character;

    if (character == typeracer.next_character) {
      typeracer.text_position += 1;
      setNextCharacter();
      if (character == ' ') {
        typeracer.words_complete += 1;
        move(typeracer.user, 1, 0);
      }
      typeracer.statusError = false;
      $('#feedback').text("GOOD");
    } else {
      typeracer.statusError = true;
      $('#feedback').text("BAD");
    }

    if (typeracer.text_position == typeracer.block.length && typeracer.next_character == "") {
      typeracer.end = Date.now();
      typeracer.words_complete += 1;
      move(typeracer.user, 1, 0);
      $('#text_type').blur();
      $('#text_type').attr('disabled', 'disabled');
    }

    updateScreen();
    updateDebug();
  });

  var TILE_SIZE_X = 50;
  var TILE_SIZE_Y = 100;
  var TILE_OFFSET_Y = 52;
  var BLOCK_SIZE = 100;

  function move(user, x, y) {
    var object = user;

    var DISTANCE_X = TILE_SIZE_X;
    var DISTANCE_Y = TILE_SIZE_Y - TILE_OFFSET_Y;
    var MAX_USER_X = 400;

    if (user.getX() > MAX_USER_X) {
      typeracer.layer.setX(typeracer.layer.getX() - DISTANCE_X);
    }

    object.setX(object.getX() + x * DISTANCE_X);
    object.setY(object.getY() + y * DISTANCE_Y);
  };

  function drawElement(element, ix, iy, ox, oy, w, h) {
    var x = ix * TILE_SIZE_X + ox;
    var y = iy * (TILE_SIZE_Y - TILE_OFFSET_Y) + oy;

    element.setWidth(w);
    element.setHeight(h);
    element.setX(x);
    element.setY(y);

    typeracer.layer.add(element);
  }

  function drawTile(type, ix, iy) {
    var ox = 0;
    var oy = 0;
    var image;
    if (type == "W") {
      image = typeracer.images["tile_water"];
    } else if (type == "G") {
      image = typeracer.images["tile_grass"];
    } else if (type == "S") {
      ox = 0;
      oy = -22;
      image = typeracer.images["overlay_selector"];
    } else if (type == "R") {
      ox = 0;
      oy = -21;
      image = typeracer.images["overlay_rock"];
    }

    tile = new Kinetic.Image({
      image: image
    });

    drawElement(tile, ix, iy, ox, oy, TILE_SIZE_X, TILE_SIZE_Y);

    return tile;
  };

  var sources = {
    character_boy: "images/planet_cute/Character Boy.png",
    character_cat_girl: "images/planet_cute/Character Cat Girl.png",
    character_horn_girl: "images/planet_cute/Character Horn Girl.png",
    character_pink_girl: "images/planet_cute/Character Pink Girl.png",
    character_princess_girl: "images/planet_cute/Character Princess Girl.png",
    overlay_rock: "images/planet_cute/Rock.png",
    overlay_selector: "images/planet_cute/Selector.png",
    tile_grass: "images/planet_cute/Grass Block.png",
    tile_water: "images/planet_cute/Water Block.png"
  };

  var CHARACTER_IMAGE_KEYS = ['character_boy', 'character_cat_girl', 'character_horn_girl', 'character_pink_girl', 'character_princess_girl'];
  function randomCharacterImage() {
    return CHARACTER_IMAGE_KEYS[Math.floor(Math.random() * CHARACTER_IMAGE_KEYS.length)];
  }

  function drawUser(ix, iy) {
    var image_key = randomCharacterImage();
    tile = new Kinetic.Image({
      image: typeracer.images[image_key]
    });

    typeracer.users.push(tile);
    drawElement(tile, ix, iy, 0, -20, TILE_SIZE_X, TILE_SIZE_Y);
    tile.setZIndex(999);
  }

  function loadImages(sources, callback){
    typeracer.images = {};
    var loadedImages = 0;
    var numImages = 0;
    for (var src in sources) {
      numImages++;
    }
    for (var src in sources) {
      typeracer.images[src] = new Image();
      typeracer.images[src].onload = function(){
        if (++loadedImages >= numImages) {
          callback(typeracer.images);
        }
      };
      typeracer.images[src].src = sources[src];
    }
  }

  loadImages(sources, initGame);
});

