/**
 * upload.js — Upload delivery photo to Google Drive via Apps Script
 * Extracted from index.html inline script
 * Dependencies: app-globals.js (for getLocalDateTimeString, showModal, closeModal, db)
 */

function uploadDeliveryPhotoToDrive(event, jobKey) {
  var file = event.target.files[0];
  if (!file) return;

  showModal('\u23F3 \u0E01\u0E33\u0E25\u0E31\u0E07\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14\u0E23\u0E39\u0E1B...', '\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E2D\u0E2A\u0E31\u0E01\u0E04\u0E23\u0E39\u0E48 \u0E23\u0E30\u0E1A\u0E1A\u0E01\u0E33\u0E25\u0E31\u0E07\u0E2A\u0E48\u0E07\u0E23\u0E39\u0E1B\u0E40\u0E02\u0E49\u0E32 Google Drive...', '', '');

  var reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = function() {
    var base64Data = reader.result.split(',')[1];

    var payload = {
      imageBytes: base64Data,
      mimeType: file.type,
      fileName: 'delivery_' + jobKey + '_' + Date.now() + '.jpg'
    };

    var appsScriptUrl = 'https://script.google.com/macros/s/AKfycbzTSTEwGGpnQ_JfRisJDhqZ__mqZCyfj___EyS8rhB2DKIdqedXdzPfmAL6u000BkPe/exec';

    fetch(appsScriptUrl, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    .then(function(response) { return response.json(); })
    .then(function(result) {
      closeModal();
      if (result.status === 'success') {
        var photoUrl = result.url;
        var todayStr = getLocalDateTimeString();

        db.ref('delivery_jobs/' + todayStr + '/' + jobKey).update({
          photoUrl: photoUrl
        }, function(err) {
          if (!err) {
            showModal('\uD83C\uDF89 \u0E22\u0E2D\u0E14\u0E40\u0E22\u0E35\u0E48\u0E22\u0E21', '\u0E41\u0E19\u0E1A\u0E23\u0E39\u0E1B\u0E2B\u0E25\u0E31\u0E01\u0E10\u0E32\u0E19\u0E40\u0E02\u0E49\u0E32 Google Drive \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22', '\u003Cbutton class=\"btn-ok\" onclick=\"closeModal(); if(typeof showDriverMyJobsView===\'function\') showDriverMyJobsView();\"\u003E\u0E15\u0E01\u0E25\u0E07\u003C/button\u003E');
          }
        });
      } else {
        showModal('\uD83D\uDEA7 \u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08', '\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08: ' + (result.message || '\u0E44\u0E21\u0E48\u0E17\u0E23\u0E32\u0E1A\u0E2A\u0E32\u0E40\u0E2B\u0E15\u0E38'), '<button class="btn-ok" onclick="closeModal()">\u0E15\u0E01\u0E25\u0E07</button>');
      }
    })
    .catch(function(error) {
      closeModal();
      showModal('\uD83D\uDEA7 \u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14', '\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D: ' + error, '<button class="btn-ok" onclick="closeModal()">\u0E15\u0E01\u0E25\u0E07</button>');
    });
  };
}
