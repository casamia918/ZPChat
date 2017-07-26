(function() {
  const App = {};

  App.init = function() {
    App.username = 'username';
    App.canvas = document.getElementsByTagName('canvas')[0];
    App.chatList = $('#chat-list')
    App.ctx = App.canvas.getContext('2d');
    App.ctx.fillStyle = 'solid';
    App.ctx.lineCap = 'round'
    App.setting = {
      lineWidth: 1,
      strokeStyle: '#ECD018'
    }
    $('#line-width-picker').val(App.setting.lineWidth);
    $('#color-picker').val(App.setting.strokeStyle);

    App.chatScrollToBottom();
    App.startSocket();
  };

  App.draw = function(x,y,strokeStyle, lineWidth, type) {
    const ctx = this.ctx;
    switch(type) {
      case "dragstart":
        ctx.beginPath();
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.moveTo(x,y);
        break;
      case "drag":
        ctx.lineTo(x,y);
        ctx.stroke();
        break;
      default:
        ctx.closePath();
    }
  }

  App.clearCanvas = function() {
    this.ctx.clearRect(0, 0, App.canvas.width, App.canvas.height);
  }

  App.startSocket = function() {

    const roomNumber = getRoomNumber();

    function getRoomNumber() {
      const path = window.location.pathname;
      const paths = path.split('/');
      const roomIndex = paths.indexOf('room');
      return paths[roomIndex+1];
    }

    App.socket = io.connect('http://localhost:3000?room='+roomNumber, {
      path: '/socket'
    });

    App.socket.on('connect', ()=>{
      console.log('connected', App.socket.id);
      App.socket.emit('loadCanvas', data => {
        console.log('emit loadCanvas cb');
        if(data) {
          console.log('emit loadCanvas cb: data found');
          App.blobToCanvas(data);
        } else {
          console.log('emit loadCanvas cb: data not found');
        }
      });

      App.socket.emit('getUsername', data => {
        App.username = data;
      })
    })
    App.socket.on('error', (e)=>{
      console.log('socket error', e);
      alert('오류가 발생했습니다. 메인으로 돌아가셔서 방에 다시 입장해주세요');
    });
    App.socket.on('draw', data => {
      App.draw.apply(App, data.args)
    });
    App.socket.on('saveCurrentCanvas', cb => {
      console.log('on saveCurrentCanvas');
      const blob = App.canvas.toDataURL();
      cb(blob);
    })
    App.socket.on('clearCanvas', ()=>{
      App.clearCanvas();
    })
    App.socket.on('chat', data => {
      App.appendChat.apply(App, data.args);
    })
    App.socket.on('disconnect', (reason)=>{
      console.log('disconnect', reason);
      alert('disconnected!')
    });
  }

  App.blobToCanvas = function (blob){
    var img = new Image();
    img.src = blob;
    img.onload = function () {
      App.ctx.drawImage(img,0,0);
    }
  }

  App.appendChat = function(username, message, isMyMessage) {
    const messageElement = document.createElement('li');
    if(isMyMessage) {
      messageElement.setAttribute('class', 'message my-message');
    } else {
      messageElement.setAttribute('class', 'message');
    }
    messageElement.innerHTML = `${username}: ${message}`

    this.chatList.append(messageElement);
    App.chatScrollToBottom();
  }

  App.chatScrollToBottom = function() {
    this.chatList.scrollTop(this.chatList.prop('scrollHeight'));
  }

  App.writeChat = function() {
    const message = $('#message-input').val()
    if(!message) {
      return;
    }
    $('#message-input').val("");
    this.appendChat(this.username, message, true);
    this.socket.emit('chat', {
      // username and isMyMessage tag will be added on the server
      args: [message]
    })
  }


  var savedStrokeStyle;
  $('#eraser').click(function() {
    const white = '#FFFFFF'
    if($(this).attr('state') === 'on') {
      App.setting.strokeStyle = savedStrokeStyle;
      $('#color-picker').val(savedStrokeStyle);
      $(this).attr('state', 'off');
    } else {
      savedStrokeStyle = App.setting.strokeStyle;
      App.setting.strokeStyle = white;
      $('#color-picker').val(white);
      $(this).attr('state', 'on');
    }
  })

  $('canvas').on('mousewheel DOMMouseScroll', function(e) {
    var E = e.originalEvent;
    delta = 0;
    if (E.detail) {
      delta = E.detail * -40;
    } else {
      delta = E.wheelDelta;
    };
    const currentWidth = App.setting.lineWidth;
    const newWidth = Number(currentWidth) + delta / 120 || 1;
    $('#line-width-picker').val(newWidth).trigger('change');
    e.preventDefault();
  })

  $('canvas').on('drag dragstart dragend', function(e) {
    var offset, type, x, y;
    type = e.handleObj.type;
    offset = $(this).offset();
    x = e.pageX - offset.left;
    y = e.pageY - offset.top;
    App.draw(x, y, App.setting.strokeStyle, App.setting.lineWidth, type);
    App.socket.emit('draw', {
      args: [ x, y, App.setting.strokeStyle, App.setting.lineWidth, type ]
    })
  });

  $('canvas').click(function() {
    $('#message-input').blur();
  });

  $(document).keyup(function(e) {
    if(e.target.id !== 'message-input') {
      if(e.key === 'e') {
        $('#eraser').trigger('click');
      }
      if(e.key === 'c') {
        $('#clear-canvas').trigger('click');
      }
    }
  });

  $('#message-input').keyup(function(e) {
    if(e.which == 13) { // 13: enter
      App.writeChat();     
    }
  });

  $('#color-picker').on('change', function(e) {
    const eraser = $('#eraser');
    if(eraser.attr('state') === 'on') {
      e.preventDefault();
    } else {
      App.setting.strokeStyle = e.target.value;
    }
  })

  $('#line-width-picker').on('change', function(e) {
    App.setting.lineWidth = e.target.value;
  });

  $('#clear-canvas').click(function(){
    if(confirm('Clearing canvas? Are you sure?')) {
      App.clearCanvas();
      App.socket.emit('clearCanvas');
    }
  })

  $('#message-button').click(function(){
    App.writeChat();
  });



  $(function() {
    App.init();
  })

}).call(this)
