$(function() {
  $('#create-room-form').submit(function(e){
    e.preventDefault();
    const form = $(this);
    const data = $('#create-room-form :input').filter(function(index, element){
      return $(element).val != "";
    }).serialize();
    $.ajax({
      url: form.attr('action'),
      type: 'POST',
      data: data,
      dataType: "json",
      success: function(data, textStatus, jqXHR) {
        $('#create-room-modal').modal('hide');
        if(typeof data.redirect === 'string') {
          window.location = data.redirect;
        }
      },
      error: function(request, textStatus, error) {
        console.log('error happend');
        console.log(request);
        console.log(textStatus);
        alert(JSON.parse(request.responseText).error)
      }
    });
  })

  $('#private-room-checkbox').change(function(e) {
    console.log(e.target.checked);
    const passwordField = $('#room-password')
    if(e.target.checked) {
      passwordField.removeAttr('disabled')
    } else {
      passwordField.attr('disabled', 'disabled')
    }
  })

  function resetModal(modal) {
    $('input', modal).val('');
    $('input[type="checkbox"]', modal).prop('checked', false)
  }

  $('#create-room-modal').on('hide.bs.modal', function(e) {
    resetModal($('#create-room-modal'))
  })

  function addRowClickHandler() {
    $('.room-row').click(function() {
      console.log('.room-row#click');
      const row = $(this);
      const isPrivate = row.attr("is-private");
      const roomPath = row.attr('data-href');
      checkJoinable(roomPath, (err, result)=>{
        if(err) {
          return alert(err);
        }
        console.log(result);
        if(result.joinable) {
          console.log('isPrivate', isPrivate);
          if(isPrivate || isPrivate ==="") {
            const password = prompt('Input room password');
            if(password !== null) {
              joinRoom(roomPath, password);
            }
          } else {
            joinRoom(roomPath);
          }
        } else {
          alert(result.message);
        }
      });

      function checkJoinable(roomPath, cb) {
        $.ajax({
          url: roomPath+'/joinable',
          method: 'get',
          dataType: 'json',
          success: function(data, textStatus, jqXHR) {
            cb(null, data);
          },
          error: function(request, textStatus, error) {
            console.log('checkJoinable error');
            cb(JSON.parse(request.responseText).error);
          }
        })
      }

      function joinRoom(roomPath, password) {
        const data = {password};
        $.ajax({
          url: roomPath,
          method: 'put',
          dataType: 'json',
          data: data,
          success: function(data, textStatus, jqXHR) {
            if(typeof data.redirect === 'string') {
              window.location = data.redirect;
            }
          },
          error: function(request, textStatus, error) {
            console.log('joinRoom error');
            console.log(request);
            console.log(textStatus);
            console.log(error);
            alert(JSON.parse(request.responseText).error)
          }
        })
      }
    })
  }
  addRowClickHandler();

  (function poll() {
    setTimeout(function() {
      $.ajax({
        url: '/main/room-list',
        method: 'get',
        dataType: "html",
        success: function(data) {
          $('#room-list-body').html(data);
          addRowClickHandler();
        },
        complete: poll,
        timeout: 3000
      })
    }, 3000)
  })();


})
