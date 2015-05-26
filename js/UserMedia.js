﻿(function(){
    'use strict';

    var mediaStream = null;
    var webcamList  = [];
    var currentCam  = null;
    var photoReady  = false;
    
    // writeError(string) - Provides a way to display errors to the user

    var writeError = function(string) {
        var elem = document.getElementById('error');
        var p    = document.createElement('div');
        p.appendChild(document.createTextNode('ERROR: ' + string));
        elem.appendChild(p);
    };
    
    // initializeVideoStream() - Callback function when getUserMedia() returns successfully with a mediaStream object
    // 1. Set the mediaStream on the video tag
    // 2. Use 'srcObject' attribute to determine whether to use the standard-based API or the legacy version

    var initializeVideoStream = function(stream) {
        mediaStream = stream;

        var video = document.getElementById('videoTag');
        if (typeof (video.srcObject) !== 'undefined') {
            video.srcObject = mediaStream;
        }
        else {
            video.src = URL.createObjectURL(mediaStream);
        }
        if (webcamList.length > 1) {
            document.getElementById('switch').disabled = false;
        }
    };

    // getUserMediaError() - Callback function when getUserMedia() returns error
    // 1. Show the error message with the error.name

    var getUserMediaError = function(e) {
        if (e.name.indexOf('NotFoundError') >= 0) {
            writeError('Webcam not found.');
        }
        else {
            writeError('The following error occurred: "' + e.name + '" Please check your webcam device(s) and try again.');
        }
    };

    // savePhoto() - Function invoked when click on the canvas element
    // 1. If msSaveBlob is supported, get the the photo blob from the canvas and save the image file
    // 2. Otherwise, set up the download attribute of the anchor element and download the image file

    var savePhoto = function() {
        if (photoReady) {
            var canvas = document.getElementById('canvasTag');
            if (navigator.msSaveBlob) {
                var imgData = canvas.msToBlob('image/jpeg');
                navigator.msSaveBlob(imgData, 'myPhoto.jpg');
            }
            else {
                var imgData = canvas.toDataURL('image/jpeg');
                var link    = document.getElementById('saveImg');
                link.href   = imgData;
                link.download = 'myPhoto.jpg';
                link.click();
            }
            canvas.removeEventListener('click', savePhoto);
            document.getElementById('photoViewText').innerHTML = '';
            photoReady = false;
        }
    };

    // capture() - Function called when click on video tag
    // 1. Capture a video frame from the video tag and render on the canvas element

    var capture = function() {

        if (!mediaStream) {
            return;
        }

        var video       = document.getElementById('videoTag');
        var canvas      = document.getElementById('canvasTag');
        canvas.removeEventListener('click', savePhoto);
        var videoWidth  = video.videoWidth;
        var videoHeight = video.videoHeight;

        if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
            canvas.width  = videoWidth;
            canvas.height = videoHeight;
        }

        var ctx    = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        photoReady = true;
        document.getElementById('photoViewText').innerHTML = 'Click or tap below to save as .jpg';
        canvas.addEventListener('click', savePhoto);

    };

    // nextWebCam() - Function to rotate through the webcam device list
    // 1. Release the current webcam (if there is one in use)
    // 2. Call getUserMedia() to access the next webcam

    var nextWebCam = function() {
        document.getElementById('switch').disabled = true;
        if(currentCam !== null) {
            currentCam++;
            if(currentCam >= webcamList.length) {
                currentCam = 0;
            }
            var video = document.getElementById('videoTag');
            video.srcObject = null;
            video.src = null;
            if(mediaStream) {
                var videoTracks = mediaStream.getVideoTracks();
                videoTracks[0].stop();
                mediaStream = null;
            }
        }
        else {
            currentCam = 0;
        }

        navigator.mediaDevices.getUserMedia({
            video: {
                width: 1280,
                height: 720,
                deviceId: { exact: webcamList[currentCam] }
            }
        }).then(initializeVideoStream).catch(getUserMediaError);
    };
    
    // deviceChanged() - Handle devicechange event
    // 1. Reset webcamList
    // 2. Re-enumerate webcam devices

    var deviceChanged = function() {
        navigator.mediaDevices.removeEventListener('devicechange', deviceChanged);
        // Reset the webcam list and re-enumerate
        webcamList = [];
        /*eslint-disable*/
        navigator.mediaDevices.enumerateDevices().then(devicesCallback);
        /*eslint-enable*/
    };
    
    // devicesCallback() - Callback function for device enumeration
    // 1. Identify all webcam devices and store the info in the webcamList
    // 2. Start the demo with the first webcam on the list
    // 3. Show the webcam 'switch' button when there are multiple webcams
    // 4. Show error message when there is no webcam
    // 5. Register event listener (devicechange) to respond to device plugin or unplug

    var devicesCallback = function(devices) {
        // Identify all webcams
        for (var i = 0; i < devices.length; i++) {
            if (devices[i].kind === 'videoinput') {
                webcamList[webcamList.length] = devices[i].deviceId;
            }
        }

        if (webcamList.length > 0) {
            // Start video with the first device on the list
            nextWebCam();
            if (webcamList.length > 1) {
                document.getElementById('switch').disabled = false;
            }
            else {
                document.getElementById('switch').disabled = true;
            }
        }
        else {
            writeError('Webcam not found.');
        }
        navigator.mediaDevices.addEventListener('devicechange', deviceChanged);
    };

    // init() - The entry point to the demo code
    // 1. Detect whether getUserMedia() is supported, show an error if not
    // 2. Set up necessary event listners for video tag and the webcam 'switch' button
    // 3. Detect whether device enumeration is supported, use the legacy media capture API to start the demo otherwise
    // 4. Enumerate the webcam devices when the browser supports device enumeration

    var init = function() {
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        document.getElementById('videoTag').addEventListener('click', capture,   false);
        document.getElementById('switch')  .addEventListener('click', nextWebCam, false);

        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            navigator.mediaDevices.enumerateDevices().then(devicesCallback);
        }
        else if (navigator.getUserMedia) {
            document.getElementById('tooltip').innerHTML = 'Cannot switch web cams because navigator.mediaDevices.enumerateDevices is unsupported by your browser.';

            navigator.getUserMedia({ video: true }, initializeVideoStream, getUserMediaError);
        }
        else {
            writeError('You are using a browser that does not support the Media Capture API');
        }
    };    
    
    init();

}());
