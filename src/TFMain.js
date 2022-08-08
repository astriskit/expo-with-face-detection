import React from 'react'
import { Camera } from 'expo-camera'
import { StyleSheet, Platform } from 'react-native';
import * as tf from '@tensorflow/tfjs';
import * as FaceDetector from 'expo-face-detector';
import { Progress, NativeBaseProvider, Box, Button, Center } from 'native-base';

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

const tests = [{
    title: 'Detecting number of faces',
    instructionText: 'Get into camera frame',
    errorMessage: 'Ensure that there is one face in the frame',
    test: (faceData) => {
        console.log(faceData, 'faceData')
        return faceData.length === 1
    }
}];
export class TFMain extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isTfReady: false,
            detectedFaces: undefined,
            currentTestIndex: undefined,
            tests: tests.map(test => ({ ...test, success: false }))
        };
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
        // console.log(faces)
        const { detector, currentTestIndex } = this.state
        if (!detector || currentTestIndex === undefined) return;
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

    render() {
        const { isTfReady, currentTestIndex, tests } = this.state;

        const progress = this.getProgress();

        // console.log(progress, 'progress')

        const cmnCameraProps = {
            style: styles.camera,
            type: Camera.Constants.Type.front,
            resizeHeight: 200,
            resizeWidth: 152,
        }
        const webCameraProps = {
            resizeDepth: 3,
            onDetector: this.setWebDetector.bind(this),
            onReady: this.handleWebCameraStream.bind(this),
            onError: this.onSomeError,
            autorender: true,
            maxFaces: 2,
        }
        const nativeCameraProps = {
            onFacesDetected: this.handleNativeFaceDetection.bind(this),
            faceDetectorSettings: {
                mode: FaceDetector.FaceDetectorMode.fast,
                detectLandmarks: FaceDetector.FaceDetectorLandmarks.all,
                runClassifications: FaceDetector.FaceDetectorClassifications.none,
                minDetectionInterval: 100,
                tracking: true,
            }
        }

        const allTestsDone = this.allTestsDone()

        const startOrCancelOrRestart = allTestsDone ? 'Re-start' : currentTestIndex === undefined ? 'Start' : 'Cancel'
        const instruction = allTestsDone ? 'Test: Ok' : currentTestIndex === undefined ? 'Press on start button to proceed' : tests[currentTestIndex]?.instructionText ?? tests[currentTestIndex]?.title

        return (
            <NativeBaseProvider>
                {isTfReady ? (
                    <Box flex={1}>
                        {instruction && (
                            <Box textAlign="center" fontSize="lg">{instruction}</Box>
                        )}
                        <Progress value={progress} mx={10} mb={2} />
                        <Center flex={1}>
                            <TensorCamera
                                {...(Platform.OS === 'web' ? webCameraProps : nativeCameraProps)}
                                {...cmnCameraProps}
                            />
                        </Center>
                        <Button onPress={this.startOrCancel.bind(this)} my={2} mx={10}>{startOrCancelOrRestart}</Button>
                    </Box>
                ) : (
                    <Box flex={1}>
                        Getting ready or the system-failed; check console, in-case of any doubts!
                    </Box>
                )}
            </NativeBaseProvider>
        )
    }
}

const styles = StyleSheet.create({
    camera: {
        // flex: 1,
        borderRadius: 20,
        width: 325,
        height: 200
    }
})