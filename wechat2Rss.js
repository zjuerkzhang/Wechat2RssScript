function main(){
    var interestingUps = [
        "drpei",
        "包邮区", "渤海小吏", "饭统戴老板",
        "集思录", "老和山下的小学僧", "卢克文工作室",
        "兽楼处", "睡前人间", "睡前消息编辑部", "天机奇谈", "铁头功社",
        "西西弗评论", "远川科技评论", "远川投资评论", "远川研究所"];
    var timeWaitForWakeupMobile = 1000;
    var timeBeforeBack = 1000;
    var timeWaitForBack = 2000;
    var timeWaitForClick = 3000;
    var longWait = 5000;
    var shortWait = 500;
    var onlyNewMessage = true;
    var targetXmlFilePath = "/sdcard/Wechat2Rss/Wechat2Rss.xml";

    device.wakeUpIfNeeded();
    sleep(timeWaitForWakeupMobile);

    if (!text("订阅号消息").exists())
    {
        app.launchApp("微信");
        sleep(longWait);
        while(!text("微信").exists()){
            console.log("没有'微信'字样，模拟返回按键");
            back();
            sleep(timeWaitForBack);
        }
    }
    else
    {
        var t = text("订阅号消息").findOnce();
        //console.log(t );
        if (t != null && t.id().indexOf("text1") >= 0)
        {
            back();
            sleep(timeWaitForBack);
        }
    }

    sleep(shortWait);
    var ret = goToChatTab();
    if (!ret)
    {
        return;
    }
    sleep(shortWait);
    if (onlyNewMessage && !hasNewMessage())
    {
		console.log("没有新文章");
        home();
        return;
    }


    goToSubscriberAccountSession();
    sleep(longWait);
    var lv = selector().className("ListView").findOnce();
    //console.log(lv);
    var lls = lv.children();
    var articleTitles = [];
    for (var i = 0; i<lls.length; i++)
    {
        //console.log("公众号列表: i = " + String(i))
        var breakTextElems = lls[i].find(text("以下是更早消息"));
        var noNewElems = lls[i].find(text("已无更多订阅消息"));
        if (breakTextElems.length > 0 || noNewElems.length > 0)
        {
            console.log("发现'以下是更早消息/已无更多订阅消息'，停止搜索");
            if (onlyNewMessage)
            {
                break;
            }
        }
        var upName = "";
        var clickElems = lls[i].find(clickable());
        for (var j = 0; j<clickElems.length; j++)
        {
            console.log("公众号头像.文章列表 = " + String(i) + "." + String(j))
            var tvs = clickElems[j].find(textMatches(".+"));
            var isUpHeaderElem = false;
            for (var k = 0; k < tvs.length; k++)
            {
                if (interestingUps.indexOf(tvs[k].text()) >=0 )
                {
                    isUpHeaderElem = true;
                    upName = tvs[k].text();
                    console.log("发现感兴趣公众号: " + upName);
                    break;
                }
            }
            if (!isUpHeaderElem && tvs.length > 0)
            {
                console.log("公众号 [" + upName + "] 的文章: " + tvs[0].text());
                articleTitles.push(tvs[0].text());
                //clickElems[j].click();
                //sleep(timeWaitForClick);
                //back();
            }
        }

    }
    console.log("---------------------");
    for (var i = 0; i < articleTitles.length; i++)
    {
        console.log(String(i+1) + ": " + articleTitles[i]);
    }
    console.log("---------------------");

    for (var i = 0; i < articleTitles.length; i++)
    {
        var processStr = "--> 处理文章 [" + String(i+1) + "/" + String(articleTitles.length) + "]: ";
        console.log(processStr +  "'" + articleTitles[i] + "'")
        if (articleTitles[i].indexOf("余下") == 0 || articleTitles[i].indexOf("展开") == 0 )
        {
            continue;
        }
        var link = getArticleLink(articleTitles[i]);
        if (link != "")
        {
            titleLinkMap.push([articleTitles[i], link]);
        }
    }

    if (titleLinkMap.length > 0)
    {
        var rssXmlContent = generateRssXmlFile(titleLinkMap);
        //console.log(rssXmlContent);
        sleep(shortWait);
    }

    back();
    sleep(timeWaitForBack);
    var ret = clickByTextClickableElemsInSteps(["订阅号消息", "删除该聊天", "删除"], ["long", "", ""]);
    home();



    function clickByTextClickableElemsInSteps(texts, clickTypes)
    {
        for (var i = 0; i < texts.length; i++)
        {
            var textElem = text(texts[i]).findOnce();
            if (!textElem)
            {
                console.log("没有找到text元素 [" + texts[i] + "]");
                return false;
            }

            var clickableElem = getTheToppestClickableElem(textElem);
            if (!clickableElem)
            {
                console.log("没有找到text元素 [" + texts[i] + "] 对应的可点击元素");
                return false;
            }
            if (clickTypes[i] == 'long')
            {
                clickableElem.longClick();
            }
            else
            {
                clickableElem.click();
            }
            sleep(timeWaitForClick);
        }
        return true;
    }



    function generateRssItem(title, link)
    {
        return '<item>\
                <title>' + title + '</title>\
                <link>' + link + '</link>\
                <description>' + title + '</description>\
                </item>';
    }

    function generateRssXmlFile(titleLinkMap)
    {
        var xmlStr =   '<?xml version="1.0" encoding="UTF-8" ?>\
                        <rss version="2.0">\
                        <channel>\
                        <title>微信公众号精选</title>\
                        <link>https://www.testing.com</link>\
                        <description>微信公众号精选</description>';
        for (var i = 0; i < titleLinkMap.length; i++)
        {
            var rssItemStr = generateRssItem(titleLinkMap[i][0], titleLinkMap[i][1]);
            xmlStr = xmlStr + rssItemStr;
        }
        xmlStr = xmlStr + '</channel></rss>';

        var targetFilePath = targetXmlFilePath;
        files.ensureDir(targetFilePath);
        files.write(targetFilePath, xmlStr);
        return xmlStr;
    }

    function getArticleLink(articleTitle)
    {
        if (articleTitle.indexOf("余下") == 0)
        {
            return "";
        }
        text(articleTitle).waitFor();
        var titleElem = text(articleTitle).findOnce();
        //console.log(articleTitle);
        //console.log(titleElem);
        var clickArticle = getTheToppestClickableElem(titleElem);
        if (!clickArticle)
        {
            console.log("无法找到可点击的文章项，文章标题: " + articleTitle);
            return "";
        }
        clickArticle.click();
        sleep(timeWaitForClick);
        id("eo").waitFor();
        //sleep(longWait);
        var threeDotsImg = id("eo").findOnce();
        if (!threeDotsImg)
        {
            console.log("无法找到文章的三点菜单，文章标题: " + articleTitle);
            back();
            sleep(timeWaitForBack);
            return "";
        }
        threeDotsImg.click();
        sleep(timeWaitForClick);
        text("复制链接").waitFor();
        var copyText = text("复制链接").findOnce();
        var copyClickElem = getTheToppestClickableElem(copyText);
        copyClickElem.click();
        link = getClip();
        console.log(articleTitle + " ==> " + link);
        sleep(timeBeforeBack);
        back();
        return link;
    }

    function goToChatTab()
    {
        var textElems = text("微信").find();
        console.log("微信 textElems.length = " + String(textElems.length));
        var wxTextElem = null;
        if (textElems.length == 1)
        {
            wxTextElem = textElems[0];
        }
        else{
            for (var i = 0; i< textElems.length; i++)
            {
                //console.log(textElems[i].id());
                if (textElems[i].id().indexOf("f2s") >= 0)
                {
                    wxTextElem = textElems[i];
                    break;
                }
            }
        }
        if (!wxTextElem)
        {
            console.log("没有找到'微信'标签");
            return false;
        }
        var tabElem = getTheToppestClickableElem(wxTextElem);
        if (!tabElem)
        {
            console.log("没有找到带'微信'可以点击的元素");
            return false;
        }
        tabElem.click();
        return true;
    }

    function hasNewMessage()
    {
        var imgViews = selector().className("ImageView").find();
        //console.log("红点 imgViews.length = " + String(imgViews.length));
        for (var i=0; i < imgViews.length; i++)
        {
            //console.log(imgViews[i].id());
            if (imgViews[i].id() && imgViews[i].id().indexOf("a2f") >= 0)
            {
                console.log("有新消息");
                return true;
            }
        }
        console.log("没有新消息");
        return false;
    }



    function goToSubscriberAccountSession()
    {
        var textElem = text("订阅号消息").findOnce();
        var a = getTheToppestClickableElem(textElem);
        //console.log(a);
        a.click();
        sleep(longWait); // wait for subscriber page update
    }

    function getTheToppestClickableElem(startElem)
    {
        if (!startElem)
        {
            return startElem;
        }
        var retElem = startElem;
        while (!retElem.clickable())
        {
            retElem = retElem.parent();
        }
        return retElem;
    }
}

toast("开始执行脚本");
console.log("开始执行脚本")
main();
console.log("脚本执行完成")
toast("脚本执行完成");
//toast("开始运行脚本");
//engines.execScript("Wechat2Rss", "main();\n" + main.toString(),{
//    loopTimes: 0,
//    interval: 1800000
//});

