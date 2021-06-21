var express = require("express");
// var server = require('http').Server(app);
const multer = require("multer");
const fs = require("fs");
const pool = require("./pool/pool.js");
const app = express();

app.all("*", function (req, res, next) {
  const headers = req.headers
  //设置允许跨域的域名，*代表允许任意域名跨域
  res.header("Access-Control-Allow-Origin", "*");
  
  if (req.method.toLowerCase() == "options") {
    //允许的header类型
    res.header("Access-Control-Allow-Headers", headers['Access-Control-Request-Headers'] || headers['access-control-request-headers']);
    //跨域允许的请求方式
    res.header("Access-Control-Allow-Methods", "DELETE,PUT,POST,GET,OPTIONS");
    res.header('Access-Control-Max-Age', 7*24*60*60)
    res.end()
  } else {
    next();
  }
});

const bodyParser = require("body-parser");

const e = require("cors");
const { Date } = require("core-js");
let server = require("http")
  .createServer(app)
  .listen(9000,()=>{
    // console.log('9000-端口服务器-启动成功')
  });
var io = require("socket.io")(server);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(express.static("public"));

const storage = multer.diskStorage({
  //存储的位置
  destination(req, file, cb) {
    cb(null, "public/images/");
  },
  //文件名字的确定 multer默认帮我们取一个没有扩展名的文件名，因此需要我们自己定义
  filename(req, file, cb) {
    cb(null, Date.now() + file.originalname);
  },
});
const upload = multer({
  storage
});



io.use((socket, next) => {
  socket.id = socket.handshake.auth.uid;
  next();
});

io.on("connection", (socket) => {
  // console.log(socket.id)
  //转发单发消息
  socket.on("puoToMessage", (data) => {
    // console.log(data.uid,data.sid)
    // console.log(data)
    socket.to(data.uid).emit('oToMessage','返回错误')
    if (data.type == "audio/mp3") {
      let dates = Date.now()
      const ws  = fs.createWriteStream(`./public/audio/${dates}.mp3`)
      ws.write(data.audio)
      data.audio = `http://localhost:9000/audio/${dates}.mp3`
      socket
        .compress(true)
        .to(data.sid)
        .emit("oToMessage", data);
      
      pool.query(`insert into blobfile set ?`, [data], (err, result1) => {
        if (err) throw err;
      });
    }
    if (data.type == "text") {
      socket
        .compress(true)
        .to(data.sid)
        .emit("oToMessage", data);
      pool.query(`insert into blobfile set ?`, [data], (err, result1) => {
        if (err) throw err;
      });
    }
  });
});

let e401 = {
  code: 401,
  msg: "参数不完整!",
}
let e402 = {
  code: 402,
  msg: "失败,参数错误!",
}

//获取历史记录  消息列表 传入当前用户的id 格式 uid=xxx
app.get("/getHistoryMsg", (req, res) => {
  // console.log(req.query);
  let data = req.query;
  if (!data.uid) return res.send(e401)
  pool.query(
    `select uid,sid from blobfile where uid=${data.uid} or sid=${data.uid} GROUP BY uid,sid`,
    (err, result1) => {
        try{
          let SetFilter = new Set();
          result1.forEach((e, i) => {
            SetFilter.add(e["uid"]);
            SetFilter.add(e["sid"]);
          });
          let filter = [...SetFilter];
    
          filter.splice(filter.indexOf(data.uid), 1);
          // console.log(filter);
          let arr = [];
          //把聊过天的人都筛选出来
          filter.forEach((e, i) => {
            if (e == data.uid) {
              arr.push({
                uid: data.uid, //后期传入  （ 客户端 用户id ）
                sid: e,
                msgArr: [],
                be:null //聊天的人的消息，拿到这个人的头像和名字
              });
            } else {
              arr.push({
                uid: data.uid, //后期传入  （ 客户端 用户id ）
                sid: e,
                msgArr: [],
                be:null
              });
            }
          });
          // console.log(object); 
          pool.query(`select * from blobfile where uid=${data.uid} or sid=${data.uid} order by m_id DESC`, (err, result2) => {
            try {
              arr.forEach((by, i) => {
                result2.forEach((con) => {
                  if(by.be == null){
    
                    if(by.sid == con.uid){
                      arr[i]['be'] = {
                        uid:con.uid,
                        uname:con.uname,
                        head_img:con.head_img
                      }
                    }
                    if(con.uid==by.uid && con.sid==by.sid){
                      arr[i]['be'] = {
                        uid:con.sid,
                        uname:con.be_uname,
                        head_img:con.be_head_img
                      }
                    }
                  }
                  if (
                    (by.uid == con.uid && by.sid == con.sid) ||
                    (con.uid == by.sid && con.sid == by.uid)
                  ) {
                    if (arr[i].msgArr.length >= 15) {
                      return;
                    }
                  
                    // con.audio = con.audio.buffer;
                    // console.log(con.audio);
                    arr[i].msgArr.unshift(con);
                  }
                });
              });
              res.send({
                code: 200,
                msg: "获取成功",
                data: arr,
              });
            } catch (e) {
              return res.send({
                code: 401,
                msg: '获取失败'
              })
            }
          });
        }catch(e){
            return res.send(e402)
        }
    }
  );
});

//添加人员信息
app.post("/uploadImg", upload.single("file"), (req, res) => {
  // console.log("进入");
  let obj = {};
  obj["uid"] = req.body.uid;
  obj["imgPath"] = "/images/" + req.file.filename;
  obj["uname"] = req.body.uname;
  res.send(obj);
});



//未读消息更改为已读
//根据 用户的uid 和 目标 sid 更 改当前的状态把 未读 更改为已读 0：未读  1：已读
//列表点击后，，把所有未读状态清空
app.post("/updateMsgRead", (req, res) => {
  let data = req.body
  if(!data.uid || !data.sid )return res.send(e401)
  try {
    let data = req.body;
    pool.query(
      `update blobfile set is_read=1 where uid ='${data.uid}' and sid = ${data.sid};`,
      (err, result1) => {
        try{
            if (err) throw 402;
            res.send({
              code: 200,
              msg: '修改成功!'
            })
        }catch(e){
            if(e==402){
              return res.send(e402)
            }
        }
      }
    );
  } catch (e) {
    return res.send(e402);
  }
});

//语音消息已读
//需要uid 和 sid m_id  生成的随机消息码，每条消息不重复
app.post('/updateVoiceRead', (req, res) => {
  try {
    let data = req.body;
    if (!data.uid || !data.sid || !data.m_id) throw 401;
    pool.query(`update blobfile set audio_isRead=1 
    where uid=${data.uid} and 
    sid=${data.sid} and m_id=${data.m_id}`, (err, result1) => {
      // console.log('111')
      try{
        if (err) throw 402
        return res.send({
          code: 200,
          msg: '修改成功'
        })
      }catch(e){
        if(e==402){
          res.send(e402)
        } 
      }
      
    })
  } catch (e) {
    if (e == 401) {
      return res.send(e401)
    }
    if (e == 402) {
      return res.send(e402)
    }
  }
})

//分页获取数据 每次15条
//需要最旧的一个 m_id 也就是前端显示的数组内容第一条数据
//需要以下参数
// {
//    uid:1623237531255,
//    sid:623242699311,
//    m_id:1623307663500,
//    currentPage:15,
//     pageSize     当前页码
// }
app.get('/getHistoryPage',(req,res)=>{
  let data = req.query
  // console.log(data)
  if(!data.uid || !data.sid || !data.m_id || !data.pageSize){
    return res.send(e401)
  }
  pool.query(`select * from 
  (select * from blobfile where ((uid=${data.uid} and sid=${data.sid}) 
  or (uid=${data.sid} and sid=${data.uid}))
  ) as temp where temp.m_id<${data.m_id} ORDER BY temp.m_id DESC limit 0,14;
  `,(err,result1)=>{
      if(err) return res.send(e402)
 
      res.send({
        code:200,
        msg:'获取成功',
        data:result1
      })
  })
})
