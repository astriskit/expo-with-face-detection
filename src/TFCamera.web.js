import React from 'react'
import { Camera } from 'expo-camera'
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import '@mediapipe/face_mesh';

async function getFaceDetector(opts = {}) {
    const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
    const detectorConfig = {
        runtime: 'tfjs',
        ...opts,
    };
    const detector = await faceLandmarksDetection.createDetector(model, detectorConfig);
    return detector
}

const TensorCamera = (props) => {
    const { onReady, resizeWidth, resizeHeight, type, onError, onDetector, maxFaces, ...restProps } = props

    const [cam, setCam] = React.useState(null)

    React.useEffect(() => {
        if (cam && onReady) {
            const videoEls = document.getElementsByTagName('video')
            if (videoEls.length === 1) {
                getFaceDetector({ maxFaces }).then(detector => {
                    onDetector && onDetector(detector);
                    return tf.data.webcam(videoEls[0], { resizeHeight, resizeWidth, type })
                }).then((webcamIterator) => {
                    onReady(webcamIterator)
                }).catch(err => {
                    console.error(err)
                    onError(err)
                })
            }
        }
        return () => {
            if (cam && cam.playing) {
                cam?.pause();
            }
        }
    }, [cam])

    const refCb = (el) => {
        setCam(el)
    }

    return (
        <Camera
            ref={refCb}
            {...restProps}
        />
    )
}

export { TensorCamera }