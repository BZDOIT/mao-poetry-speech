#!/usr/bin/env node
/*
 * 诗词库全书回归核对
 * 底本：人民文学出版社《毛泽东诗词全编鉴赏》EPUB 解析数据（tools/book_items.json，74篇）
 *      该底本因版权原因未随仓库分发，需自备，详见 README
 * 用法：node tools/verify_poems.js
 * 退出码：0 = 全部通过；1 = 有未命中诗句 / 篇目缺失 / id 重复；2 = 未找到底本
 *
 * 两类检查：
 *  A. 诗行级：库中每一行诗（除月性原诗、呈父亲改作——该书未收）逐字在底本中可查
 *  B. 篇目级：底本 74 篇每篇取正文探针，确认库内对应 id 条目内容相符
 */
const fs=require('fs');
const path=require('path');

const ROOT=path.join(__dirname,'..');
const HTML=path.join(ROOT,'毛主席诗词演讲稿生成器.html');
const BOOK=path.join(__dirname,'book_items.json');

if(!fs.existsSync(BOOK)){
  console.error('✗ 未找到底本 tools/book_items.json');
  console.error('  该文件是《毛泽东诗词全编鉴赏》EPUB 的解析数据，因版权原因未随仓库分发。');
  console.error('  如需运行全书回归核对，请自备该书 EPUB，解析出 74 篇条目后放入 tools/book_items.json。');
  process.exit(2);
}

const html=fs.readFileSync(HTML,'utf8');
const m=html.match(/const POEMS = (\[[\s\S]*?\n\]);/);
if(!m){console.error('✗ 未能从 HTML 提取 POEMS 数组');process.exit(1);}
const POEMS=eval(m[1]);

let failures=0;
const fail=msg=>{console.error(' ✗',msg);failures++;};

console.log('POEMS 条目数:',POEMS.length,'(应为 76：75 毛诗 + 1 月性原诗)');
if(POEMS.length!==76)fail('POEMS 条目数异常：'+POEMS.length);
const ids=POEMS.map(p=>p.id);
if(new Set(ids).size!==ids.length)fail('存在重复 id');

const book=JSON.parse(fs.readFileSync(BOOK,'utf8'));
const han=s=>(s.match(/[一-鿿]/g)||[]).join('');

/* 底本串：去标点；去 epub 混入的锚点文字；补回 epub 缺字 */
let bookCn=book.slice(0,74).map(b=>b.verse).join('');
bookCn=han(bookCn).replace(/原注/g,'').replace(/其一|其二/g,'')
  .replace('斥每闻','斥鷃每闻').replace('盗跖庄流誉','盗跖庄蹻流誉');

/* 库用通行简体 → 底本用字（朗诵同音，属刻意异文，不算错） */
const toBook={'惟余莽莽':'惟馀莽莽','今日得宽余':'今日得宽馀','氤氲':'氤氳','鬓雪':'鬂雪'};
const SKIP=new Set(['yuexing','fuqin']);

let lines=0;
for(const p of POEMS){
  if(SKIP.has(p.id))continue;
  for(const t of p.text){
    const n=han(t);
    if(n.length<2)continue;
    lines++;
    let n2=n;
    for(const [a,b] of Object.entries(toBook))n2=n2.split(a).join(b);
    if(!bookCn.includes(n)&&!bookCn.includes(n2))fail(`${p.id} 《${p.title}》 诗行未命中：${n}`);
  }
}
console.log(`A. 诗行级核对 ${lines} 行`);

/* 篇目级：底本标题 → 库 id */
const map={
'贺新郎 别友':'bieyou','沁园春 长沙':'changsha','菩萨蛮 黄鹤楼':'hhl','西江月 井冈山':'jgs',
'清平乐 蒋桂战争':'jgzz','采桑子 重阳':'chongyang','如梦令 元旦':'yuandan','减字木兰花 广昌路上':'gcsl',
'蝶恋花 从汀州向长沙':'dcz','渔家傲 反第一次大“围剿”':'fanweijiao1','渔家傲 反第二次大“围剿”':'fanweijiao2',
'菩萨蛮 大柏地':'dabaidi','清平乐 会昌':'huichang','十六字令三首':'shiliuziling','忆秦娥 娄山关':'loushanguan',
'七律 长征':'changzheng','念奴娇 昆仑':'kunlun','清平乐 六盘山':'liupanshan','沁园春 雪':'xue',
'七律 人民解放军占领南京':'nanjing','七律 和柳亚子先生':'liuyazi','浣溪沙 和柳亚子先生':'changye',
'浪淘沙 北戴河':'beidaihe','水调歌头 游泳':'youyong','蝶恋花 答李淑一':'dali','七律二首 送瘟神':'wenshen',
'七律 到韶山':'shaoshan','七律 登庐山':'lushan','七绝 为女民兵题照':'nvmibing','七律 答友人':'dayouren',
'七绝 为李进同志题所摄庐山仙人洞照':'xianrendong','七律 和郭沫若同志':'heguomo','卜算子 咏梅':'yongmei',
'七律 冬云':'dongyun','满江红 和郭沫若同志':'manjianghong','七律 吊罗荣桓 同志':'diaoluo','贺新郎 读史':'dushi',
'水调歌头 重上井冈山':'chongjgs','念奴娇 鸟儿问答':'niaoer','五古 挽易昌陶':'wanyi','七古 送纵宇一郎东行':'songluozhang',
'虞美人 枕上':'zhenshang','西江月 秋收起义':'qiushou','六言诗 给彭德怀同志':'pengdehuai','临江仙 给丁玲同志':'dingling',
'五律 挽戴安澜 将军':'daianlan','五律 张冠道中':'zhangguan','五律 喜闻捷报':'jiebao',
'七律 和周世钊同志':'hezhou','五律 看山':'kanshan','七绝 莫干山':'moganshan','七绝 五云山':'wuyunshan',
'七绝 观潮':'guanchao','七绝 刘蕡 [1]':'liufen','七绝 屈原':'quyuan','七绝二首 纪念鲁迅 八十寿辰':'luxun2',
'杂言诗 八连颂':'baliansong','念奴娇 井冈山':'jgs65','七律 洪都':'hongdu','七律 有所思':'yousuosi',
'七绝 贾谊':'jiayi','七律 咏贾谊':'yongjiayi','四言诗 祭母文':'jimuwen','归国谣 今宵月':'guijinyao',
'四言诗 祭黄陵文':'jihuangling','七律 重庆谈判':'cangsheng','七绝 仿陆游 诗':'fangluyou',
'七律 改鲁迅诗':'gailuxun','七律 读《封建论》 呈郭老':'dufengjianlun'};
const dubao=['dubao11','dubao12a','dubao12b','dubao60'];
const byId=Object.fromEntries(POEMS.map(p=>[p.id,p]));
let covered=0;
book.slice(0,74).forEach((b,i)=>{
  let id=(b.title==='浣溪沙 和柳亚子先生')?(i===21?'changye':'yanchu'):map[b.title];
  if(!id&&b.title==='七律 读报')id=dubao.shift();
  if(!id)return fail('无映射: '+b.title);
  const p=byId[id];
  if(!p)return fail(`库缺条目: ${id} (${b.title})`);
  let body=b.verse;
  if(id==='changye')body=body.slice(body.indexOf('长夜难明'));
  const ptext=han(p.text.join(''));
  const probes=[han(body).slice(0,12),han(body).slice(6,18),han(body).slice(12,24)];
  if(probes.some(q=>q.length>=6&&ptext.includes(q.slice(0,6))))covered++;
  else fail(`内容不符: ${id} 《${b.title}》 探针=${probes[0]}`);
});
console.log(`B. 篇目覆盖 ${covered}/74`);

if(failures){console.error(`\n回归未通过：${failures} 处问题`);process.exit(1);}
console.log('\n✓ 全书回归全部通过（诗行零误差，74 篇全覆盖）');
