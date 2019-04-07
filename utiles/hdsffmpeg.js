var ffmpeg = require('fluent-ffmpeg');
var Movie = require('../models/movie');
var Setting = require('../models/setting');
const Watermark = require('../models/watermark');
var fs = require('fs');
var sharp = require('sharp');
var t;
exports.dotranscode = function () {
  Movie.findOne({ status: 'converting' }).exec(function (err, movie) {
    clearTimeout(t);
    timesearch();
    if (!movie) {
      transcode();
    }
  });
};
function timesearch() {
  t = setTimeout(() => {
    exports.dotranscode();
  }, 60000);
}
transcode = function () {
  Movie.findOne({ status: 'waiting' }).exec(function (err, movie) {
    if (err) {
      console.log(err);
    }
    if (movie) {
      var path = movie.path;
      var id = movie._id;
      var outpath = './public/videos/';
      var des = outpath + id;
      var videoarr = path.split('.');
      videoarr.pop();
      var srtpath = videoarr.join('.') + '.srt';

      if (!fs.existsSync(des)) {
        fs.mkdirSync(des);
      }

      ffmpeg.ffprobe(path, function (err, metadata) {
        if (err) {
          console.log(err);
        }
        if (!metadata) {
          Movie.findOne({ _id: id }).exec(function (err, movie) {
            if (err) {
              console.log(err);
            }
            movie.status = 'error & failed';
            movie.save(function (err) {
              console.log(err);
            });
          });
          try {
            fs.unlinkSync(path);
            deleteall(path);
          } catch (e) {
            console.log('[Error] delete error' + path)
          }
          return false;
        }
        var videostreams = metadata.streams;
        var videooriginW;
        for (var i = 0; i < videostreams.length; i++) {
          if (videostreams[i].codec_type == 'video') {
            videooriginW = videostreams[i].width;
            break;
          }
        }
        Movie.findOne({ _id: id }).exec(function (err, movie) {
          if (err) {
            console.log(err);
          }
          movie.duration = parseInt(metadata.format.duration / 60);
          movie.save(function (err) {
            console.log(err);
          });
        });
        Setting.find().exec(function (err, setting) {
          var wmimage = setting[0].wmpath;
          var markdir = './public/mark/mark.png';
          var tsjiami = setting[0].tsjiami;
          var thesetting = setting[0];
          if (!wmimage || wmimage == '') {
            wmimage = markdir;
          }
          var vf =
            'movie=' +
            wmimage +
            ' [watermark]; [in][watermark] overlay=main_w-overlay_w [out]';
          let hds = [];
          let rate = 0;
          for (let index = 0; index < setting[0].hds.length; index++) {
            const hd = setting[0].hds[index];
            let w = 0;
            if (hd == 240) {
              if (videooriginW < 424) {
                w = videooriginW;
              } else {
                w = 424;
              }
              rate = getrate(thesetting, hd);
              hds.push({
                h: hd,
                hd: 320,
                w: w,
                bv: rate,
                bufsize: rate * 2,
                maxrate: rate
              });
            } else if (hd == 360) {
              if (videooriginW < 636) {
                w = videooriginW;
              } else {
                w = 636;
              }
              rate = getrate(thesetting, hd);
              hds.push({
                h: hd,
                hd: 480,
                w: w,
                bv: rate,
                bufsize: rate * 2,
                maxrate: rate
              });
            } else if (hd == 480) {
              if (videooriginW < 848) {
                w = videooriginW;
              } else {
                w = 848;
              }
              rate = getrate(thesetting, hd);
              hds.push({
                h: hd,
                hd: 640,
                w: w,
                bv: rate,
                bufsize: rate * 2,
                maxrate: rate
              });
            } else if (hd == 640) {
              if (videooriginW < 1138) {
                w = videooriginW;
              } else {
                w = 1138;
              }
              rate = getrate(thesetting, hd);
              hds.push({
                h: hd,
                hd: 1138,
                w: w,
                bv: rate,
                bufsize: rate * 2,
                maxrate: rate
              });
            } else if (hd == 720) {
              if (videooriginW < 1280) {
                w = videooriginW;
              } else {
                w = 1280;
              }
              rate = getrate(thesetting, hd);
              hds.push({
                h: hd,
                hd: 1280,
                w: w,
                bv: rate,
                bufsize: rate * 2,
                maxrate: rate
              });
            } else if (hd == 1080) {
              if (videooriginW < 1920) {
                w = videooriginW;
              } else {
                w = 1920;
              }
              rate = getrate(thesetting, hd);
              hds.push({
                h: hd,
                hd: 1920,
                w: w,
                bv: rate,
                bufsize: rate * 2,
                maxrate: rate
              });
            }
          }
          if (tsjiami == 'on') {
            fs.writeFileSync(
              des + '/key.info',
              setting[0].host + '/videos/' + id + '/ts.key\n' + des + '/ts.key'
            );
            var key = randomkey();
            fs.writeFileSync(des + '/ts.key', key);
          }
          Watermark.find().exec(function (err, watermarks) {
            if (err) {
              console.log(err);
            }
            if (watermarks.length == 0) {
              watermarks.push({
                path: './public/mark/blank.png',
                place: 'topleft'
              })
            }
            for (let index = 0; index < watermarks.length; index++) {
              const watermark = watermarks[index];
              const image = sharp(watermark.path);
              image
                .metadata()
                .then(function (metadata) {
                  image
                    .resize({ width: parseInt(metadata.width * videooriginW / 1920) })
                    .toFile(des + '/' + index + '.png', err => {
                      if (err) {
                        console.log(err)
                      }
                      if (index == watermarks.length - 1) {
                        moreffmpegtranscode(
                          path,
                          des,
                          hds,
                          id,
                          tsjiami,
                          thesetting,
                          watermarks,
                          srtpath
                        );
                      }
                    })
                })
            }
          })
        });
      });
    }
  });
};
async function moreffmpegtranscode(
  path,
  des,
  hds,
  id,
  tsjiami,
  thesetting,
  watermarks,
  srtpath
) {
  var command = ffmpeg(path)
    .audioCodec('aac')
    .videoCodec('libx264')
    .addOptions([
      '-ac 2',
      '-b:a 128k',
      '-q:v 6',
      '-strict -2',
      '-pix_fmt yuv420p',
      '-movflags faststart'
    ]);
  await Movie.updateOne({ _id: id }, { $set: { status: 'converting' } });
  for (let index = 0; index < hds.length; index++) {
    const hd = hds[index];
    let randompath = randowpath();
    let savepath = des + '/' + randompath;
    let config = [];
    let size = 30;
    let watermarkconfig = "";
    fs.mkdirSync(savepath);
    if (hd.h == 240) {
      size = 10;
    } else if (hd.h == 360) {
      size = 15;
    } else if (hd.h == 480) {
      size = 20;
    } else if (hd.h == 720) {
      size = 30;
    } else if (hd.h == 1080) {
      size = 45;
    } else if (hd.h == 640) {
      size = 26
    }
    for (let index = 0; index < watermarks.length; index++) {
      const watermark = watermarks[index];
      let overlay = '';
      if (watermark.place == 'lefttop') {
        overlay = '10:10';
      } else if (watermark.place == 'righttop') {
        overlay = 'W-w-10:10';
      } else if (watermark.place == 'leftbottom') {
        overlay = '10:H-h-10';
      } else {
        overlay = 'W-w-10:H-h-10';
      }
      const theindex = index + 1;
      if (watermarkconfig.length > 0) {
        watermarkconfig += '[tmp][' + theindex + ':v]overlay=' + overlay + '[tmp],'
      } else {
        watermarkconfig += '[0:v][' + theindex + ':v]overlay=' + overlay + '[tmp],'
      }
    }
    if (watermarkconfig.length > 0) {
      let watermarkconfigarr = watermarkconfig.split('[tmp]');
      watermarkconfigarr.pop();
      watermarkconfig = watermarkconfigarr.join('[tmp]');
      watermarkconfig += ',';
    }
    var srtexists = fs.existsSync(srtpath);
    if (thesetting.paomadeng.length > 0) {
      config = [
        '-b:v ' + hd.bv + 'k',
        '-bufsize ' + hd.bufsize + 'k',
        '-maxrate ' + hd.maxrate + 'k',
        '-filter_complex ' +
        watermarkconfig +
        'scale=' +
        hd.w +
        ":-2,drawtext=fontfile=./paomadeng.ttf:text='" +
        thesetting.paomadeng +
        "':fontcolor=white:fontsize=" +
        size +
        ':y=10:x=w-(w+tw)/' +
        thesetting.paotime +
        '*mod(t\\,' +
        thesetting.paojiange +
        '):enable=lt(mod(t\\,' +
        thesetting.paojiange +
        ')\\,' +
        thesetting.paotime +
        ')'
      ];
      if (srtexists) {
        config = [
          '-b:v ' + hd.bv + 'k',
          '-bufsize ' + hd.bufsize + 'k',
          '-maxrate ' + hd.maxrate + 'k',
          '-filter_complex ' +
          watermarkconfig +
          'scale=' +
          hd.w +
          ":-2,drawtext=fontfile=./paomadeng.ttf:text='" +
          thesetting.paomadeng +
          "':fontcolor=white:fontsize=" +
          size +
          ':y=10:x=w-(w+tw)/' +
          thesetting.paotime +
          '*mod(t\\,' +
          thesetting.paojiange +
          '):enable=lt(mod(t\\,' +
          thesetting.paojiange +
          ')\\,' +
          thesetting.paotime +
          '),subtitles=' +
          srtpath
        ];
      }
    } else {
      config = [
        '-b:v ' + hd.bv + 'k',
        '-bufsize ' + hd.bufsize + 'k',
        '-maxrate ' + hd.maxrate + 'k',
        '-filter_complex ' + watermarkconfig + 'scale=' + hd.w + ':-2'
      ];
      if (srtexists) {
        config = [
          '-b:v ' + hd.bv + 'k',
          '-bufsize ' + hd.bufsize + 'k',
          '-maxrate ' + hd.maxrate + 'k',
          '-filter_complex ' + watermarkconfig +
          'scale=' +
          hd.w +
          ':-2,subtitles=' +
          srtpath
        ];
      }
    }
    let newcommand = command
      .clone()
      .addOptions(config)
    for (let index = 0; index < watermarks.length; index++) {
      newcommand = newcommand.clone()
        .input(des + '/' + index + '.png')
    }
    newcommand
      .on('error', async function (err) {
        console.log("can't transcode this movie" + path + err.message);
        deleteall(savepath);
        await Movie.updateOne({ _id: id }, { $set: { status: '转码错误' } });
      })
      .on('end', async function () {
        if (thesetting.keepmp4.indexOf(hd.h) > -1) {
          fs.writeFileSync(
            des + '/' + hd.h + '.mp4',
            fs.readFileSync(savepath + '/1.mp4')
          );
        }
        if (thesetting.isqiepian == 'on') {
          thechunk(des, savepath, tsjiami);
        } else {
          fs.unlinkSync(savepath + '/1.mp4');
        }
        await Movie.updateOne(
          { _id: id },
          {
            $push: { m3u8paths: { hd: hd.hd, path: savepath + '/index.m3u8' } }
          }
        );
        if (index == hds.length - 1) {
          await Movie.updateOne({ _id: id }, { $set: { status: 'finished' } });
          screenshots(path, des);
        }
      })
      .save(savepath + '/1.mp4');
  }
}
function thechunk(des, savepath, tsjiami) {
  var chunkconfig = [
    '-c copy',
    '-bsf:v h264_mp4toannexb',
    '-hls_time 10',
    '-strict -2',
    '-start_number 0',
    '-hls_list_size 0'
  ];
  if (tsjiami == 'on') {
    chunkconfig.push('-hls_key_info_file ' + des + '/key.info');
  }
  ffmpeg(savepath + '/1.mp4')
    .addOptions(chunkconfig)
    .output(savepath + '/index.m3u8')
    .on('end', function () {
      console.log('thechunk')
      fs.unlinkSync(savepath + '/1.mp4');
    })
    .run();
}
function screenshots(path, des) {
  Setting.find().exec(function (err, setting) {
    if (err) {
      console.log(err);
    }
    ffmpeg.ffprobe(path, function (err, metadata) {
      if (err) {
        console.log(err);
      }
      var duration = metadata.format.duration;
      var count = setting[0].screenshots;
      var shotduration = Math.floor(duration / count);
      var screentime = [];
      for (let index = 0; index < count; index++) {
        const element = shotduration * (index + 1);
        screentime.push(element);
      }
      for (let index = 0; index < screentime.length; index++) {
        const duration = screentime[index];
        const ss = formatSeconds(duration);
        ffmpeg(path)
          .addInputOption('-ss', ss)
          .addOptions(['-vframes:v 1'])
          .output(des + '/' + index + '.jpg')
          .on('error', function (err, stdout, stderr) {
            console.log('cant screenshot' + err.message);
          })
          .on('end', function () {
            if (index == 0) {
              var imgfile = des + '/0.jpg';
              fs.readFile(imgfile, (err, data) => {
                if (err) {
                  console.log(
                    'Error reading file ' + imgfile + ' ' + err.toString()
                  );
                } else {
                  sharp(data)
                    .resize(730, 410)
                    .toFile(des + '/730.jpg', err => {
                      if (err) {
                        console.log(err);
                      }
                    });
                  sharp(data)
                    .resize(350, 197)
                    .toFile(des + '/350.jpg', err => {
                      if (err) {
                        console.log(err);
                      }
                    });
                }
              });
            }
            if (index == screentime.length - 1) {
              if (
                setting[0].gifkaiguan == 'on' &&
                setting[0].gifstart < metadata.format.duration
              ) {
                togif(path, des, setting[0]);
              } else {
                fs.unlinkSync(path);
              }
            }
          })
          .run();
      }
    });
  });
}
function togif(path, des, setting) {
  const { gifduration, gifstart, gifwidth } = setting;
  if (gifduration && gifstart && gifwidth) {
    ffmpeg(path)
      .addOptions([
        '-ss ' + gifstart,
        '-t ' + gifduration,
        '-r 15',
        '-vf scale=' + gifwidth + ':-1'
      ])
      .output(des + '/1.gif')
      .on('end', function () {
        fs.unlinkSync(path);
      })
      .run();
  } else {
    fs.unlinkSync(path);
  }
}
function deleteall(path) {
  var files = [];
  if (fs.existsSync(path)) {
    files = fs.readdirSync(path);
    files.forEach(function (file, index) {
      var curPath = path + '/' + file;
      if (fs.statSync(curPath).isDirectory()) {
        // recurse
        deleteall(curPath);
      } else {
        // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}
function formatSeconds(value) {
  var theTime = parseInt(value); // 秒
  var theTime1 = 0; // 分
  var theTime2 = 0; // 小时
  if (theTime >= 60) {
    theTime1 = parseInt(theTime / 60);
    theTime = parseInt(theTime % 60);
    if (theTime1 >= 60) {
      theTime2 = parseInt(theTime1 / 60);
      theTime1 = parseInt(theTime1 % 60);
    }
  }
  var result = '';
  if (theTime > 9) {
    result = '' + parseInt(theTime);
  } else {
    result = '0' + parseInt(theTime);
  }
  if (theTime1 > 0) {
    if (theTime1 > 9) {
      result = '' + parseInt(theTime1) + ':' + result;
    } else {
      result = '0' + parseInt(theTime1) + ':' + result;
    }
  } else {
    result = '00' + ':' + result;
  }
  if (theTime2 > 0) {
    if (theTime2 > 9) {
      result = '' + parseInt(theTime2) + ':' + result;
    } else {
      result = '0' + parseInt(theTime2) + ':' + result;
    }
  } else {
    result = '00' + ':' + result;
  }
  return result;
}
function randowpath() {
  var data = [
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g'
  ];
  var result = '';
  for (var i = 0; i < 6; i++) {
    var r = Math.floor(Math.random() * data.length);

    result += data[r];
  }
  return result;
}
function getrate(setting, hd) {
  const rate = setting.rate;
  const ratearr = rate.split('|');
  for (let index = 0; index < ratearr.length; index++) {
    const therate = ratearr[index];
    const rate = therate.split(':');
    if (hd == rate[0]) {
      return rate[1];
    } else {
      return 500;
    }
  }
}
function randomkey() {
  var data = [
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G'
  ];
  for (var j = 0; j < 500; j++) {
    var result = '';
    for (var i = 0; i < 16; i++) {
      r = Math.floor(Math.random() * data.length);

      result += data[r];
    }
    return result;
  }
}
