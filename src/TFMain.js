import React from 'react'
import { Camera } from 'expo-camera'
import { StyleSheet, Text, View, Dimensions, Platform } from 'react-native';
import * as tf from '@tensorflow/tfjs';
import * as FaceDetector from 'expo-face-detector';

import { TensorCamera } from './TFCamera';

const webLoop = async (images, detectFace, onError) => {
    try {
        const nextImage = await images.next()
        const nextImageTensor = nextImage.value
        if (!nextImageTensor) return;
        await detectFace(nextImageTensor)
        requestAnimationFrame(() => webLoop(images, detectFace, onError));
    } catch (error) {
        onError(`Exiting face-detection: ${error.message}`)
    }
}

export class TFMain extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isTfReady: false,
            detectedFaces: undefined,
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

    async detectFace(imageTensor) {
        const { detector } = this.state
        if (!detector) return;

        const estimationConfig = { flipHorizontal: false };
        const faces = await detector.estimateFaces(imageTensor, estimationConfig);

        console.log(faces)
        this.setState({ detectedFaces: faces?.length ?? 0 })
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
        this.setState({ detectedFaces: faces?.length ?? 0 })
    }

    setWebDetector(detector) {
        this.setState({ detector })
    }

    render() {
        const { isTfReady, detectedFaces = 0 } = this.state;

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
            maxFaces: 10,
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

        return (
            <View style={styles.container}>
                {isTfReady ? (
                    <>
                        <TensorCamera
                            {...(Platform.OS === 'web' ? webCameraProps : nativeCameraProps)}
                            {...cmnCameraProps}
                        />
                        <Text style={styles.faceCounter}>No. of faces detected: {detectedFaces}</Text>
                    </>
                ) : (
                    <Text>Getting ready or the system-failed; check console, in-case of any doubts!</Text>
                )}
            </View>
        )
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    camera: {
        flex: 1,
        borderRadius: 20,
        height: Dimensions.get("screen").height,
        width: Dimensions.get("screen").width,
    },
    faceCounter: {
        height: 60,
        width: Dimensions.get("screen").width,
        fontSize: 32,
        fontWeight: 'bold',
        right: 0,
        top: 0,
        backgroundColor: 'grey',
        color: 'white',
        textAlign: 'right',
        paddingRight: 20
    }
})