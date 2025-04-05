const express = require('express');
const bodyParser = require('body-parser');
const Tesseract = require('tesseract.js');
const cors = require('cors');
const app = express();

app.use(cors());

app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('Hello World!');
})

app.post('/', async (req, res) => {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
        return res.status(400).json({ 
          success: false,
          data: null,
          message: 'Image base64 string is required.'  
        });
    }

    try {
        const { data: { text } } = await Tesseract.recognize(imageBase64, 'eng');
        const cleanText = text.replace(/[\r\n]+/g, '').trim();

        // Preprocess the text to fix common issues
        let preprocessedText = cleanText
            .replace(/^[^{"[]+/, '') // Remove any characters before the JSON starts
            .replace(/[“”]/g, '"')   // Replace curly quotes with standard quotes
            .replace(/'/g, '"')      // Replace single quotes with double quotes
            .replace(/¥/g, '')       // Remove invalid characters like ¥
            .replace(/^"([^"]+)",/, '{"name": "$1",') // Add a key for the first value
            .trim();

        // Ensure the JSON ends with a closing brace
        if (!preprocessedText.endsWith('}')) {
            preprocessedText += '}';
        }

        let jsonFormatted;
        try {
            jsonFormatted = JSON.parse(preprocessedText);
        } catch (parseError) {
            return res.status(400).json({
                success: false,
                data: null,
                message: 'OCR output is not valid JSON',
                error: parseError.message,
                rawText: preprocessedText // Include preprocessed text for debugging
            });
        }

        return res.status(200).json({
            success: true,
            data: jsonFormatted,
            message: 'Successfully extracted JSON from image'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            data: null,
            message: 'Failed to process image with OCR',
            error: error.message
        });
    }    
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
})
