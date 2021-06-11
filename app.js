var express = require("express");
// var server = require('http').Server(app);
const multer = require("multer");
const fs = require("fs");
const pool = require("./pool/pool.js");
const app = express();
const buffer = require("buffer").buffer;
app.all("*", function (req, res, next) {
  //设置允许跨域的域名，*代表允许任意域名跨域
  res.header("Access-Control-Allow-Origin", "*");
  //允许的header类型
  res.header("Access-Control-Allow-Headers", "content-type");
  //跨域允许的请求方式
  res.header("Access-Control-Allow-Methods", "DELETE,PUT,POST,GET,OPTIONS");
  if (req.method.toLowerCase() == "options") res.send(200);
  //让options尝试请求快速结束
  else next();
});

const bodyParser = require("body-parser");
const {
  disconnect
} = require("process");
const {
  query
} = require("./pool/pool.js");
const e = require("cors");
let server = require("http")
  .createServer(app)
  .listen(9000);
var io = require("socket.io")(server);

pool.query("select * from users", (err, data) => {
  // console.log(data);
});
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

//总人数
//消息参数判断
            // uid:window.sessionStorage.getItem('uid'),//发送者id
            // sid:that.separateMessage.uid,  //  接收者id
            // audio:blob, //语音消息,
            // message:'',  //文本消息
            // type:'audio/mp3',
            // head_img:that.myImg,
            // uname:that.uname,
            // is_read:0, // text是否已读
            // send_date:that.$getDate(),
            // send_time:that.$getTime(),
            // audio_isRead:0,  //语音是否已读
            // m_id:Date.now(),  //发送毫秒数 用于排序 和 是否已读
            // be_uname:that.separateMessage.uname,
            // be_head_img:that.separateMessage.imgPath

io.on("connection", (socket) => {
  //转发单发消息
  socket.on("puoToMessage", (data) => {
    socket.to(data.uid).emit('oToMessage','返回错误')
    if (data.type == "audio/mp3") {
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

//获取历史记录
app.get("/getHistoryMsg", (req, res) => {
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
          console.log(filter);
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
  console.log("进入");
  let obj = {};
  obj["uid"] = req.body.uid;
  obj["imgPath"] = "/images/" + req.file.filename;
  obj["uname"] = req.body.uname;
  res.send(obj);
});

io.use((socket, next) => {
  socket.id = socket.handshake.auth.uid;
  next();
});



//未读消息更改为已读
//根据 用户的uid 和 目标 sid 更 改当前的状态把 未读 更改为已读 0：未读  1：已读
//列表点击后，，把所有未读状态清空
app.post("/updateMsgRead", (req, res) => {
  let data = req.body
  console.log(data);
  if(!data.uid || !data.sid )return res.send(e401)
  try {
    let data = req.body;
    pool.query(
      `update blobfile set is_read=1 where uid =${data.uid} and sid = ${data.sid};`,
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
// }
app.get('/getHistoryPage',(req,res)=>{
  let data = req.query
  if(!data.uid || !data.sid || !data.m_id || !data.pageSize){
    return res.send(e401)
  }
  pool.query(`select * from 
  (select * from blobfile where ((uid=${data.uid} and sid=${data.sid}) 
  or (uid=${data.sid} and sid=${data.uid}))
  ) as temp where temp.m_id<${data.m_id} limit ${(data.pageSize-1)*15},15;
  `,(err,result1)=>{
      if(err) return res.send(e402)
      res.send({
        code:200,
        msg:'获取成功',
        data:result1
      })
  })
})
