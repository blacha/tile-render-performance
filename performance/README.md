# Benchmarking tile operations

How long does it actually take to load a tile and compose it into a output tile with libvips (sharp)

| test                                                              | duration (ms) | variance (ms) |
| ----------------------------------------------------------------- | ------------- | ------------- |
| compress: 256x256.90.webp                                         | 5.2905        | 0.07          |
| compress: 256x256.avif                                            | 75.5152       | 1.53          |
| compress: 256x256.jpeg                                            | 0.7563        | 0.00          |
| compress: 256x256.lossless.webp                                   | 68.1897       | 0.76          |
| compress: 256x256.png                                             | 2.2915        | 0.01          |
| compress: 256x256.webp                                            | 4.8272        | 0.05          |
| compress: 512x512.90.webp                                         | 17.5194       | 0.22          |
| compress: 512x512.avif                                            | 318.2725      | 34.45         |
| compress: 512x512.jpeg                                            | 1.6313        | 0.01          |
| compress: 512x512.lossless.webp                                   | 127.0810      | 4.13          |
| compress: 512x512.png                                             | 7.9660        | 0.11          |
| compress: 512x512.webp                                            | 15.8391       | 0.31          |
| compose: 256x256 into 2x 128x128                                  | 11.6704       | 0.25          |
| compose: 256x256 into 4x 128x128                                  | 18.2079       | 2.59          |
| compose: 256x256 into 4x 128x128 raw                              | 12.7115       | 0.20          |
| compose: 256x256 scale 4x 128x128                                 | 10.4335       | 0.14          |
| float32: resize 256x256 to 1024x1024 and extract 256x256          | 1.6869        | 0.01          |
| float32: resize 256x256 to 16x16                                  | 0.9726        | 0.01          |
| webp: load 256x256 from buffer                                    | 1.9007        | 0.01          |
| webp: resize 256x256 to 1024 and extract 256 and compress to webp | 7.2312        | 0.10          |
| webp: resize 256x256 to 1024x1024 and extract 256x256             | 2.6587        | 0.02          |

## Running the benchmarks

```
npm install

node src/bench.mjs
```

## Dumping the images

To see what the tests are doing `--dump` can be used to write the images into `./output/:suiteName/:testName`

```
node src/bench.mjs --dump
```
