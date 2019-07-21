var express = require('express');
var router = express.Router();
var fs = require('fs');
var Movie = require('../models/movie');
var FFmpeghelper = require('../utiles/newffmpeg');

const fse = require('fs-extra');

/* GET home page. */
router.get('/', async function (req, res, next) {
  var responses = await Movie.find().sort('-createAt').exec();
  var finished = responses.filter(function (value, index, array) {
    return value.status == 'finished';
  }).length;

  var processing1 = responses.filter(function (value, index, array) {
    return value.status == 'chunking';
  }).length;

  var processing2 = responses.filter(function (value, index, array) {
    return value.status == 'trans&chunk';
  }).length;

  var waiting = responses.filter(function (value, index, array) {
    return value.status == 'waiting';
  }).length;

  var error = responses.filter(function (value, index, array) {
    return value.status == 'error & failed';
  }).length;

  res.render('index', {
    total: responses.length,
    finished: finished,
    processing: processing1 + processing2,
    waiting: waiting,
    error: error
  });
});

router.get('/movies', async function (req, res, next) {
  var response = await Movie.find().sort('-createAt').exec();
  res.json(response);
});

router.get('/movies/:id', async function (req, res, next) {
  var tmp = await Movie.find({
    _id: req.params.id
  }).exec();
  if (tmp.length > 0) {
    res.render('movie', {
      movie: tmp[0]
    })
  } else {
    res.redirect('/');
  }
});

router.get('/allMovies', async function (req, res, next) {
  var tmp = await Movie.find({
    status: 'finished'
  }).sort('-createAt').exec();
  res.render('allMovies', {
    movies: tmp
  });
});

router.post('/movies/del', async function (req, res, next) {
  var data = req.body['data[]'];
  var response = await Movie.deleteMany({
    _id: {
      $in: data
    }
  }).exec();
  for (var i = 0; i < data.length; i++) {
    try {
      await fse.remove('./output/' + data[i]);
      console.log('[Delete] success! ' + data[i]);
    } catch (err) {
      console.error(err);
    }
  }
  res.json(response);
});

router.get('/scan', function (req, res, next) {
  fs.readdir('./input', function (err, files) {
    if (err) {
      return;
    }
    var filePath = './input/';
    // 读取文件夹内容
    files.forEach(function (filename) {
      //获取当前文件的绝对路径
      var filedir = filePath + filename;
      //根据文件路径获取文件信息，返回一个fs.Stats对象
      fs.stat(filedir, function (eror, stats) {
        if (eror) {
          console.warn('获取文件stats失败');
        } else {
          var isFile = stats.isFile(); //是文件
          var isDir = stats.isDirectory(); //是文件夹
          if (isFile) {
            saveMovies2mongodb(filename, "default");
          }
          if (isDir) {
            var category = filename;
            saveMovies2mongodb(filedir + '/', category);
          }
        }
      })
    });
    res.json({
      success: 1
    });
  });
});

router.get('/transcode', function (req, res, next) {
  Movie
    .find({
      status: {
        $ne: "finished"
      }
    })
    .exec(function (err, movies) {
      if (err) {
        console.log(err);
      }
      for (let i = 0; i < movies.length; i++) {
        FFmpeghelper.transcode(movies[i]);
      }
      res.redirect('/');
    });
});

function saveMovies2mongodb(dir, category) {
  fs.readdir(dir, function (err, files) {
    if (!err) {
      files.forEach(function (file) {
        fs.stat(dir + file, function (err, stats) {
          if (err) {
            console.log(err);
          }

          if (stats.isFile && stats.size > 500000) {
            var titlearr = file.split('.');
            var savepath = file.split(' ').join('.');
            fs.renameSync(dir + file, dir + savepath);
            titlearr.splice(-1, 1);
            var title = titlearr.join('.');
            Movie.findOne({
              originalname: title
            }).exec(function (err, movie) {
              if (err) {
                console.log(err);
              }
              if (!movie) {
                var movieobj = {
                  originalname: title,
                  status: 'waiting',
                  path: dir + savepath,
                  size: stats.size,
                  createAt: Date.now(),
                  category: category
                };
                var newmovie = new Movie(movieobj);
                newmovie.save(function (err) {
                  if (err) {
                    console.log(err);
                  }
                });
              }
            });
          }
        });
      });
    }
  });
}

function deleteall(path) {
  var files = [];
  if (fs.existsSync(path)) {
    files = fs.readdirSync(path);
    files.forEach(function (file, index) {
      var curPath = path + "/" + file;
      if (fs.statSync(curPath).isDirectory()) { // recurse
        deleteall(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};
module.exports = router;