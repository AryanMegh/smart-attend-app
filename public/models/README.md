# face-api.js model weights

`src/lib/faceapi.js` loads three models from `/models` at runtime:

- `tinyFaceDetector`
- `faceLandmark68Net`
- `faceRecognitionNet`

Download the corresponding weight files (the `*-shard1` + `*-weights_manifest.json`
sets) from the face-api.js repo's `weights` folder and place them directly in
this `public/models/` directory:

https://github.com/justadudewhohacks/face-api.js/tree/master/weights

Without these files, face registration (ProfilePage) and face-verified
check-in/check-out (FaceScanner) will fail to load the camera models.
