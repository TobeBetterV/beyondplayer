This folder contains two entities: sources and destinations;

Source can be a vidlib or for example a word book.
Destination can be anki or Apple Notes.

Source should be a generator which returns source items
Source item structure is:

```
{
    id,
    frontVideo?,    // absolute video file path
    frontPreview?,  // absolute image file path
    frontText,     // front card text
    backText       // back card text,
    tags?: []
}
```

Destination is a class which has an export method with a source as a param.
This approach allows us to combine different sources and different destinations.
