// Initial code by Borui Wang, updated by Graham Roth
// For CS247, Spring 2014

var currLocation;

(function() {

  var cur_video_blob = null;
  var fb_instance;

  $(document).ready(function(){
    connect_to_chat_firebase();
    connect_webcam();

    
  });

  function connect_to_chat_firebase(){
    /* Include your Firebase link here!*/
    fb_instance = new Firebase("https://gsroth-p3-v1.firebaseio.com");
    
    navigator.geolocation.getCurrentPosition(GetLocation);

    // generate new chatroom id or use existing id
    var url_segments = document.location.href.split("/#");
    if(url_segments[1]){
      fb_chat_room_id = url_segments[1];
    }else{
      fb_chat_room_id = Math.random().toString(36).substring(7);
    }
    display_msg({m:"Share this url with your friend to join this chat: "+ document.location.origin+"/#"+fb_chat_room_id,c:"red"})

    // set up variables to access firebase data structure
    var fb_new_chat_room = fb_instance.child('chatrooms').child(fb_chat_room_id);
    var fb_instance_users = fb_new_chat_room.child('users');
    var fb_instance_stream = fb_new_chat_room.child('stream');
    var my_color = "#"+((1<<24)*Math.random()|0).toString(16);

    
    // listen to events
    fb_instance_users.on("child_added",function(snapshot){
      display_msg({m:snapshot.val().name+" joined the room",c: snapshot.val().c});
    });
    fb_instance_stream.on("child_added",function(snapshot){
      display_msg(snapshot.val());
    });

    // block until username is answered
    var username = window.prompt("Welcome! What's your name?");
    if(!username){
      username = "anonymous"+Math.floor(Math.random()*1111);
    }
    fb_instance_users.push({ name: username,c: my_color});
    $("#waiting").remove();

    // bind submission box
    $("#submission input").keydown(function( event ) {
      if (event.shiftKey && event.keyCode == 13) {
        fb_instance_stream.push({m:username+": " +$("#submission input").val(), v:cur_video_blob, c: my_color});
        $(this).val("");
        scroll_to_bottom(0);
      }
      else if (event.which == 13) {
          fb_instance_stream.push({m:username+": " +$(this).val(), c: my_color});
          $(this).val("");
          scroll_to_bottom(0);
      }
      
    });

    $('#send-message').click(function() {
        fb_instance_stream.push({m:username+": " +$("#submission input").val(), c: my_color});
        $("#submission input").val("");
        scroll_to_bottom(0);
    });

     $('#send-vimoji').click(function() {
        fb_instance_stream.push({m:username+": " +$("#submission input").val(), v:cur_video_blob, c: my_color});
        $("#submission input").val("");
        scroll_to_bottom(0);
    });

    // scroll to bottom in case there is already content
    scroll_to_bottom(1300);
  }

  // creates a message node and appends it to the conversation
  function display_msg(data){
    $("#conversation").append("<div class='msg' style='color:"+data.c+"'>"+data.m+"</div>");
    if(data.v){
      // for video element
      var video = document.createElement("video");
      video.autoplay = true;
      video.controls = false; // optional
      video.loop = true;
      video.width = 200;
      video.background = "hello";
      var source = document.createElement("source");
      source.src =  URL.createObjectURL(base64_to_blob(data.v));
      source.type =  "video/webm";

      var data = getFilterForWeatherAndTime(video);

      video.appendChild(source);


      document.getElementById("conversation").appendChild(video);
    }
  }

  function process(results) {
    console.log(results);
  }

  function getFilterForWeatherAndTime(video) {

    var weatherFilterClasses = {
    'Overcast' : 'high-grayscale',
    'Mostly Cloudy': 'med-grayscale',
    'Partly Cloudy' : 'low-grayscale',
    'Clear' : 'hue-blue',
    'Drizzle' : 'low-grayscale-blur',
    'Rain' : 'high-grayscale-blur',
    'Snow' : 'brightness-blur',
    'Fog' : 'opaque'
    };

    var timeFilterClasses = {
    'Morning' : 'hue-morning',
    'Afternoon' : 'hue-afternoon',
    'Sunrise' : 'hue-sunrise',
    'Sunset' : 'hue-sunset',
    'Night' : 'hue-night'
    };

    $.ajax({
        type:'GET',
        dataType:'jsonp',
        url:'http://api.wunderground.com/api/40a3a0a8ecc508f1/conditions/q/'+currLocation.latitude+","+currLocation.longitude+'.json',
        success:function(data) {
          var currentWeather = data.current_observation.weather;
          if (currentWeather in weatherFilterClasses) {
            video.classList.add(weatherFilterClasses[currentWeather]);
          }
          var currCity = data.current_observation.observation_location.city;
          var currentTime = data.current_observation.observation_time_rfc822.match('((?:(?:[0-1][0-9])|(?:[2][0-3])|(?:[0-9])):(?:[0-5][0-9])(?::[0-5][0-9]))')[0];
          var currentHour = parseInt(currentTime.substring(0,2));
          if ((currentHour > 0 && currentHour < 7) || (currentHour > 20 )) {
            video.classList.add(timeFilterClasses['Night']);
          } else if (currentHour > 7 && currentHour < 9) {
            video.classList.add(timeFilterClasses['Sunrise']);
          } else if (currentHour > 9 && currentHour < 12) {
            video.classList.add(timeFilterClasses['Morning']);
          } else if (currentHour > 12 && currentHour < 18) {
            video.classList.add(timeFilterClasses['Afternoon']);
          } else {
            video.classList.add(timeFilterClasses['Sunset']);
          }

          var timeElement = document.createElement("p").appendChild(document.createTextNode(currentTime.substring(0,5)));
          var weatherElement = document.createElement("p").appendChild(document.createTextNode(currentWeather));
          var locationElement = document.createElement("p").appendChild(document.createTextNode(currCity));

          document.getElementById("conversation").appendChild(document.createElement("br"));
          document.getElementById("conversation").appendChild(timeElement);
          document.getElementById("conversation").appendChild(document.createElement("br"));
          document.getElementById("conversation").appendChild(weatherElement);
          document.getElementById("conversation").appendChild(document.createElement("br"));
          document.getElementById("conversation").appendChild(locationElement);
          document.getElementById("conversation").appendChild(document.createElement("br"));
          

        },
        error:function(error) {
          console.log(error);
          alert("Couldn't retrieve feed. Try again."); 
        }
      });
  }


  function GetLocation(location) {
      currLocation = location.coords;
  }

  function scroll_to_bottom(wait_time){
    // scroll to bottom of div
    setTimeout(function(){
      $("html, body").animate({ scrollTop: $(document).height() }, 200);
    },wait_time);
  }

  function connect_webcam(){
    // we're only recording video, not audio
    var mediaConstraints = {
      video: true,
      audio: false
    };

    // callback for when we get video stream from user.
    var onMediaSuccess = function(stream) {
      // create video element, attach webcam stream to video element
      var video_width= 160;
      var video_height= 120;
      var webcam_stream = document.getElementById('webcam_stream');
      var video = document.createElement('video');
      webcam_stream.innerHTML = "<p><b>Click button or press Shift + Enter to send vimoji.</b></p>";
      // adds these properties to the video
      video = mergeProps(video, {
          controls: false,
          width: video_width,
          height: video_height,
          src: URL.createObjectURL(stream)
      });
      video.play();
      webcam_stream.appendChild(video);

      // counter
      var time = 0;
      var second_counter = document.getElementById('second_counter');
      var second_counter_update = setInterval(function(){
        second_counter.innerHTML = time++;
      },1000);

      // now record stream in 5 seconds interval
      var video_container = document.getElementById('video_container');
      var mediaRecorder = new MediaStreamRecorder(stream);
      var index = 1;

      mediaRecorder.mimeType = 'video/webm';
      // mediaRecorder.mimeType = 'image/gif';
      // make recorded media smaller to save some traffic (80 * 60 pixels, 3*24 frames)
      mediaRecorder.video_width = video_width/2;
      mediaRecorder.video_height = video_height/2;

      mediaRecorder.ondataavailable = function (blob) {
          //console.log("new data available!");
          video_container.innerHTML = "";

          // convert data into base 64 blocks
          blob_to_base64(blob,function(b64_data){
            cur_video_blob = b64_data;
          });
      };
      setInterval( function() {
        mediaRecorder.stop();
        mediaRecorder.start(3000);
      }, 3000);
      console.log("connect to media stream!");
    }

    // callback if there is an error when we try and get the video stream
    var onMediaError = function(e) {
      console.error('media error', e);
    }

    // get video stream from user. see https://github.com/streamproc/MediaStreamRecorder
    navigator.getUserMedia(mediaConstraints, onMediaSuccess, onMediaError);
  }

  // check to see if a message qualifies to be replaced with video.
  var has_emotions = function(msg){
    var options = ["lol",":)",":("];
    for(var i=0;i<options.length;i++){
      if(msg.indexOf(options[i])!= -1){
        return true;
      }
    }
    return false;
  }


  // some handy methods for converting blob to base 64 and vice versa
  // for performance bench mark, please refer to http://jsperf.com/blob-base64-conversion/5
  // note useing String.fromCharCode.apply can cause callstack error
  var blob_to_base64 = function(blob, callback) {
    var reader = new FileReader();
    reader.onload = function() {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(',')[1];
      callback(base64);
    };
    reader.readAsDataURL(blob);
  };

  var base64_to_blob = function(base64) {
    var binary = atob(base64);
    var len = binary.length;
    var buffer = new ArrayBuffer(len);
    var view = new Uint8Array(buffer);
    for (var i = 0; i < len; i++) {
      view[i] = binary.charCodeAt(i);
    }
    var blob = new Blob([view]);
    return blob;
  };

})();
