var express = require('express');
var router = express.Router();
var fs = require('fs');
var Movie = require('../models/movie');

/* GET home page. */
router.get('/', async function (req, res, next) {
  var responses = await Movie.find().sort('-createAt').exec();
  var finished = responses.filter(function (value, index, array) {
    return value.status == 'finished'
  }).length;
  var processing = responses.filter(function (value, index, array) {
    return value.status == 'converting'
  }).length;
  var waiting = responses.filter(function (value, index, array) {
    return value.status == 'waiting'
  }).length;
  var error = responses.filter(function (value, index, array) {
    return value.status == 'error'
  }).length;
  res.render('index', { total: responses.length, finished: finished, processing: processing, waiting: waiting, error: error });
});

router.get('/movies', async function (req, res, next) {
  var response = await Movie.find().sort('-createAt').exec();
  res.json(response);
});

router.post('/movies/del', async function (req, res, next) {
  var data = req.body['data[]'];
  var response = await Movie.deleteMany({ _id: { $in: data } }).exec();
  res.json(response);
});

router.get('/scan', function (req, res, next) {
  fs.readdir('./input', function (err, files) {
    if (err) {
      console.log(err);
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
          var isFile = stats.isFile();//是文件
          var isDir = stats.isDirectory();//是文件夹
          if (isFile) {
            saveMovies2mongodb(filename, "default");
          }
          if (isDir) {
            var category = filename;
            saveMovies2mongodb(filedir+'/', category);
          }
        }
      })
    });
    res.json({ success: 1 });
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
            Movie.findOne({ originalname: title }).exec(function (err, movie) {
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


module.exports = router;
