// 引用地址：https://raw.githubusercontent.com/Maasea/surgeModule/master/Script/Keep/course.js
let obj = JSON.parse($response.body);
const courseList = obj.data.courseList;

for (const course of courseList) {
  delete course.upgradeCourse;
}

$done({ body: JSON.stringify(obj) });
