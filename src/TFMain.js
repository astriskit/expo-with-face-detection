import React from 'react'
import { Camera } from 'expo-camera'
import { StyleSheet, Platform } from 'react-native';
import * as tf from '@tensorflow/tfjs';
import * as FaceDetector from 'expo-face-detector';
import { Progress, NativeBaseProvider, Box, Button, Center, VStack } from 'native-base';
import Constants from 'expo-constants'

import { TensorCamera } from './TFCamera';

const webLoop = async (images, detectFace, onError) => {
    try {
        const nextImage = await images.next()
        const nextImageTensor = nextImage.value
        if (!nextImageTensor) return;
        await detectFace(nextImageTensor)
        tf.dispose(nextImageTensor)
        requestAnimationFrame(() => webLoop(images, detectFace, onError));
    } catch (error) {
        onError(`Exiting face-detection: ${error.message}`)
    }
}

const detections = {
    BLINK: { instruction: "Blink both eyes", minProbability: 0.3 },
    TURN_HEAD_LEFT: { instruction: "Turn head left", minAngle: 15 },
    TURN_HEAD_RIGHT: { instruction: "Turn head right", minAngle: 15 },
    // NOD: { instruction: "Nod", minDiff: 1.5 },
    SMILE: { instruction: "Smile", minProbability: 0.7 }
}
const nativeTests = [
    {
        title: 'Detecting blinking eyes',
        instructionText: 'Blink your both eyes',
        errorMessage: 'Could not detect blink',
        test: (faceData) => {
            if (faceData.length > 1 || !faceData.length) return;

            const face = faceData[0]
            if (!face.hasOwnProperty('leftEyeOpenProbability')) return;

            const isLeftEyeBlinking = face?.leftEyeOpenProbability <= detections.BLINK.minProbability
            const isRightEyeBlinking = face?.rightEyeOpenProbability <= detections.BLINK.minProbability
            const isBlinking = isLeftEyeBlinking && isRightEyeBlinking

            return isBlinking;
        }
    },
    {
        title: 'Detecting left turn',
        instructionText: 'Turn your head to left',
        errorMessage: 'Could not detect left turn',
        test: (faceData) => {
            if (faceData.length > 1 || !faceData.length) return;
            if (!faceData[0]?.hasOwnProperty('yawAngle')) return;
            const yawAngle = faceData[0]?.yawAngle
            const hasLeftTurned = yawAngle >= (270 + detections.TURN_HEAD_LEFT.minAngle)
            return hasLeftTurned;
        }
    },
    {
        title: 'Detecting right turn',
        instructionText: 'Turn your head to right',
        errorMessage: 'Could not detect right turn',
        test: (faceData) => {
            if (faceData.length > 1 || !faceData.length) return;
            if (!faceData[0].hasOwnProperty('yawAngle')) return;
            const yawAngle = faceData[0]?.yawAngle
            const hasLeftTurned = yawAngle <= 90 && yawAngle >= detections.TURN_HEAD_RIGHT.minAngle
            return hasLeftTurned;
        }
    },
    {
        title: 'Detecting smile',
        instructionText: 'Please smile',
        errorMessage: 'Could not detect smile',
        test: (faceData) => {
            if (faceData.length > 1 || !faceData.length) return;
            if (!faceData[0].hasOwnProperty('smilingProbability')) return;
            const hasLeftTurned = faceData[0]?.smilingProbability >= detections.SMILE.minProbability
            return hasLeftTurned;
        }
    }
]
const tests = [{
    title: 'Detecting number of faces',
    instructionText: 'Get into camera frame',
    errorMessage: 'Ensure that there is one face in the frame',
    test: (faceData) => {
        // console.log(faceData, 'faceData')
        return faceData.length === 1
    }
},
...(Platform.OS !== 'web' ? nativeTests : [])
];

const getWidth = () => {
    return 200;
}
const getHeight = () => {
    return (4 / 3) * getWidth()
}
export class TFMain extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isTfReady: false,
            cameraEl: null,
            currentTestIndex: undefined,
            tests: tests.map(test => ({ ...test, success: false }))
        };
        this.setCameraRef = this.setCameraRef.bind(this)
        this.startOrCancel = this.startOrCancel.bind(this)
        this.handleNativeFaceDetection = this.handleNativeFaceDetection.bind(this)
        this.setWebDetector = this.setWebDetector.bind(this)
        this.handleWebCameraStream = this.handleWebCameraStream.bind(this)
    }

    async componentDidMount() {
        await tf.ready();
        const perms = await Camera.requestCameraPermissionsAsync()
        if (perms.granted) {
            this.setState({
                isTfReady: true,
            });
        }
    }

    takeTests(faces) {
        const { tests, currentTestIndex } = this.state
        if (currentTestIndex === undefined) return;

        const currentTestRes = tests[currentTestIndex]
        if (currentTestRes.success) {
            const hasNextTest = !!tests[currentTestIndex + 1]
            if (hasNextTest) {
                this.setState({ currentTestIndex: currentTestIndex + 1 })
            }
            return;
        };
        // console.log(currentTestRes, 'cTr')

        const currentTest = currentTestRes?.test ?? null;
        if (!currentTest) return;

        const isCurrentTestSuccess = currentTest(faces)
        // console.log('takeTests', isCurrentTestSuccess)
        let newTests = [...tests]
        if (isCurrentTestSuccess) {
            newTests[currentTestIndex].success = true
        }
        else {
            newTests[currentTestIndex].success = false
        }
        this.setState({ tests: newTests })
    }

    async detectFace(imageTensor) {
        const { detector, currentTestIndex } = this.state
        if (!detector || currentTestIndex === undefined) return;

        const estimationConfig = { flipHorizontal: false };
        const faces = await detector.estimateFaces(imageTensor, estimationConfig);
        this.takeTests(faces)
    }

    handleWebCameraStream(images) {
        const detectFace = this.detectFace.bind(this)
        webLoop(images, detectFace, this.onSomeError.bind(this));
    }

    onSomeError(err) {
        console.error(err)
        this.setState({ isTfReady: false })
    }

    handleNativeFaceDetection({ faces }) {
        const { currentTestIndex } = this.state
        // console.log(faces, 'faces')
        if (currentTestIndex === undefined) return;
        this.takeTests(faces)
    }

    setWebDetector(detector) {
        this.setState({ detector })
    }

    getProgress() {
        const passed = this.state.tests.filter(({ success }) => success).length
        const total = this.state.tests.length
        const progress = (passed / total) * 100
        return progress;
    }


    startOrCancel() {
        const { currentTestIndex, tests } = this.state
        if (currentTestIndex === undefined) {
            this.setState({ currentTestIndex: 0 })
            return;
        }
        this.setState({ currentTestIndex: undefined, tests: tests.map(test => ({ ...test, success: false })) })
    }

    allTestsDone() {
        const { tests } = this.state
        return tests.every(({ success }) => !!success)
    }

    setCameraRef(el) {
        this.setState({ cameraEl: el })
    }

    render() {
        const { isTfReady, currentTestIndex, tests, cameraEl } = this.state;

        const progress = this.getProgress();

        const cmnCameraProps = {
            style: styles.camera,
            type: Camera.Constants.Type.front,
            resizeHeight: getWidth(),
            resizeWidth: getHeight(),
            ref: this.setCameraRef
        }
        const webCameraProps = {
            resizeDepth: 3,
            onDetector: this.setWebDetector,
            onReady: this.handleWebCameraStream,
            onError: this.onSomeError,
            autorender: true,
            maxFaces: 2,
            cam: cameraEl
        }
        const nativeCameraProps = {
            onFacesDetected: this.handleNativeFaceDetection,
            faceDetectorSettings: {
                mode: FaceDetector.FaceDetectorMode.fast,
                detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
                runClassifications: FaceDetector.FaceDetectorClassifications.all,
                minDetectionInterval: 125,
                tracking: false,
            },
        }

        const allTestsDone = this.allTestsDone()

        const startOrCancelOrRestart = allTestsDone ? 'Re-start' : currentTestIndex === undefined ? 'Start' : 'Cancel'
        const instruction = allTestsDone ? 'Test: Ok' : currentTestIndex === undefined ? 'Press on start button to proceed' : tests[currentTestIndex]?.instructionText ?? tests[currentTestIndex]?.title

        return (
            <NativeBaseProvider>
                {isTfReady ? (
                    <Box flex={1} mt={Constants.statusBarHeight + 10}>
                        <Center flex={1}>
                            <TensorCamera
                                {...(Platform.OS === 'web' ? webCameraProps : nativeCameraProps)}
                                {...cmnCameraProps}
                            />
                        </Center>
                        <VStack flex={0.5} justifyContent="space-evenly" w="full" alignItems="stretch">
                            {instruction && (
                                <Box _text={{ textAlign: "center", fontSize: "lg" }} alignContent="stretch">{instruction}</Box>
                            )}
                            <Progress value={progress} mx={2} mb={2} minW="250" />
                            <Button onPress={this.startOrCancel} my={2} mx={10}>{startOrCancelOrRestart}</Button>
                        </VStack>
                    </Box>
                ) : (
                    <Box flex={1} pt={Constants.statusBarHeight}>
                        Getting ready or the system-failed; check console, in-case of any doubts!
                    </Box>
                )}
            </NativeBaseProvider>
        )
    }
}

const styles = StyleSheet.create({
    camera: {
        width: getWidth(),
        height: getHeight()
    }
})