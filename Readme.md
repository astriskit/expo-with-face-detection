# Introduction

This is a sort of POC for implementing feature of liveness-detection. Also, there is this relevant [article](https://osamaqarem.com/blog/intro-to-liveness-detection-with-react-native), that has been used as a guide for the core-logic in the native platform. The repo in that article is [here](https://github.com/osamaqarem/liveness-detection-react-native).

The intent is -

- [ ] be able to detect liveness through the camera on native as well as web.

- [ ] be able to integrate the tensorflow-js for the web implementation; for on-device detection - since the [native-face-detection capability](https://docs.expo.dev/versions/latest/sdk/camera/#facedetectorsettings) isn't available for web.

- [ ] as a sub-part to the web-support and analogous to the native functionality, be able to get `smileProbability`, `yawAngle`, `rollAngle`, `(right|left)EyeOpenProbability`. Because, until now, the [face-landmarks-detection](https://github.com/tensorflow/tfjs-models/tree/master/face-landmarks-detection) has only been helpful in detecting the face and landmarks on the web.


# Progression

- [x] Native - the tests can be run against the camera-feed using the expo-camera([faceDetectorSettings](https://docs.expo.dev/versions/latest/sdk/camera/#facedetectorsettings));

- [ ] Web - was a success [until](https://github.com/astriskit/expo-with-face-detection/commit/2acf4160db3bc83e5109bfc6c88e4a99cc61367b);


# Instructions to run

1) Clone the repo to a project folder.
2) Make sure, the `expo-cli` is setup aptly. Known to run just fine with expo-45 at latest.
3) Run `yarn install` in the project folder.
4) Run `yarn start` in the project folder.
5) Use the qr-code in the console or in the web-ui to scan from the device. This should run the project in the expo-go application on the device. Just standard procedure :)

### Note-1

The web is broken, so running `yarn web` will work, but feature is broken. A WIP.

### Note-2

The project wont work on the simulator due to limitations of expo-camera (check for "Platform Compatibility" in the [expo-docs](https://docs.expo.dev/versions/latest/sdk/camera))

### Note-3

The project was tried through expo-snacks; but was a failed attempt. Will try again, once in clear.



