# Benchmarking tile operations

How long does it actually take to load a tile and compose it into a output tile with libvips (sharp)


| test                                                                        | duration (ms) | variance (ms) |
| --------------------------------------------------------------------------- | ------------- | ------------- |
| compose: 256x256 into 2x 128x128                                            | 11.4963       | 0.19          |
| compose: 256x256 into 4x 128x128                                            | 17.8131       | 0.62          |
| compose: 256x256 into 4x 128x128 raw                                        | 12.7876       | 0.18          |
| compose: 256x256 scale 4x 128x128                                           | 10.6136       | 0.13          |
| float32: resize 256x256 to 1024x1024 and extract 256x256                    | 1.7190        | 0.01          |
| float32: resize 256x256 to 16x16                                            | 0.9826        | 0.00          |
| webp: load 256x256 from buffer                                              | 1.9210        | 0.01          |
| webp: resize 256x256 to 1024 and extract 256 and compress to webp           | 7.3645        | 0.12          |
| webp: resize 256x256 to 1024 and extract 256 and compress to webp_lossless  | 67.3502       | 1.01          |
| webp: resize 256x256 to 1024x1024 and extract 256x256                       | 2.7078        | 0.03          |


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