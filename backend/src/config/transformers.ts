import {
  AutoModelForImageTextToText,
  AutoProcessor,
} from "@huggingface/transformers";

const vision_model = AutoModelForImageTextToText.from_pretrained(
  "onnx-community/FastVLM-0.5B-ONNX",
  {
    dtype: {
      embed_tokens: "fp16",
      vision_encoder: "q4",
      decoder_model_merged: "q4",
    },
  }
);

const vision_processor = AutoProcessor.from_pretrained(
  "onnx-community/FastVLM-0.5B-ONNX"
);

export const vision_config = {
  model: await vision_model,
  processor: await vision_processor,
};


/*
# AutoModelForImageTextToText and AutoProcessor Explanation

-> We are importing AutoModelForImageTextToText and AutoProcessor from the @huggingface/transformers library.
-> AutoModelForImageTextToText is a class that allows us to load pre-trained models specifically designed for image-to-text tasks.
-> AutoProcessor is a class that helps us preprocess and postprocess data for these models.

# Loading the Pre-trained Model and Processor

-> We are loading a pre-trained model called "onnx-community/FastVLM-0.5B-ONNX" using the from_pretrained method of AutoModelForImageTextToText.
-> We are specifying the data types for different components of the model using the dtype parameter. This helps optimize the model's performance.
-> So in a nutshell, dtype uses `embed_tokens` as fp16, which is half-precision floating point format for the token embeddings, it is used to reduce memory usage and speed up computations.
-> dtype uses `vision_encoder` as q4, which is a quantization format that reduces the precision of the model's weights to 4 bits, this helps in reducing the model size and improving inference speed.
-> dtype uses `decoder_model_merged` as q4, which is another quantization format for the decoder part of the model, similar to the vision encoder.
-> We are also loading a pre-trained processor using the from_pretrained method of AutoProcessor, which is used to preprocess input data and postprocess model outputs.

# Exporting the Configuration

-> Finally, we are exporting an object called vision_config that contains the loaded model and processor.
-> This configuration can be used later in the code to perform image-to-text tasks using the pre-trained model and processor.
-> We used it in `src/shared/utils/describe_frame.ts` to generate descriptions for images.

*/