/*
 Navicat Premium Data Transfer

 Source Server         : rdc210_5
 Source Server Type    : MySQL
 Source Server Version : 80019
 Source Host           : localhost:3306
 Source Schema         : tj

 Target Server Type    : MySQL
 Target Server Version : 80019
 File Encoding         : 65001

 Date: 21/06/2021 01:33:25
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for admin
-- ----------------------------
DROP TABLE IF EXISTS `admin`;
CREATE TABLE `admin`  (
  `uid` int NOT NULL AUTO_INCREMENT,
  `head_img` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `username` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `uname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `upwd` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  PRIMARY KEY (`uid`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of admin
-- ----------------------------
INSERT INTO `admin` VALUES (1, 'https://i02piccdn.sogoucdn.com/fcccb1e31834f3bf', '客服1', 'admin', '123456');
INSERT INTO `admin` VALUES (2, 'http://img.72qq.com/file/202010/26/c7e8020c6f.jpg', '客服2', '10086', '123456');
INSERT INTO `admin` VALUES (3, 'http://img.72qq.com/file/202010/26/cc7e9d46d2.jpg', '客服3', '10010', '123456');
INSERT INTO `admin` VALUES (4, 'https://p2.itc.cn/q_70/images03/20210227/443b8d68527842ce98e2c7da442e2e0d.jpeg', '客服4', '10000', '123456');

SET FOREIGN_KEY_CHECKS = 1;
