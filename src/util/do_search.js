/*
 * Copyright 2012 buddycloud
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// pusher.js:
// Creates XMPP queries for the pusher component.

var xmpp = require('node-xmpp');
var xml = require('libxmljs');
var config = require('./config');

var metadataNs = 'http://buddycloud.com/channel_directory/metadata_query';
var contentNs = 'http://buddycloud.com/channel_directory/content_query';
var entryNs = 'http://www.w3.org/2005/Atom';

// Creates the basic skeleton for all types of Pub-Sub queries.
function iq(attrs, ns) {
  return new xmpp.Iq(attrs).c('query', {xmlns: ns || exports.ns});
}

exports.search = function(type, q, max, index) {
  var ns = null;
  if (type == 'metadata') {
    ns = metadataNs;
  } else if (type == 'content') {
    ns = contentNs;
  }
  var queryNode = iq({type: 'get'}, ns);
  queryNode.c('search').t(q);
  
  if (max || index) {
    var rsm = queryNode.c('rsm', {xmlns: 'http://jabber.org/protocol/rsm'});
    if (max) {
      rsm.c('max').t(max);
    }
    if (index) {
      rsm.c('index').t(index);
    }
  }
  
  return queryNode.root();
};

exports.channelsToJSON = function(reply) {
  var items = xml.parseXmlString(reply.toString()).find('//query:item', {query: metadataNs});
  var jsonItems = [];
  items.forEach(function(e){
    jsonItems.push(channelToJson(e));
  });
  return jsonItems;
}

function channelToJson(item) {
  var jid = item.attr('jid');
  var description = item.attr('description');
  var creationDate = item.attr('created');
  var title = item.get('//item:title', {item: metadataNs});
  var channelType = item.get('//item:channel_type', {item: metadataNs});
  
  jsonItem = {
    jid : jid ? jid.value() : null,
    description : description ? description.value() : null,
    creationDate : creationDate ? creationDate.value() : null,
    title : title ? title.text() : null,
    channelType : channelType ? channelType.text() : null    
  };
  
  return jsonItem;
}

function postToJson(item) {
  var entry = item.child(0);
  
  var id = item.attr('id');
  var author = entry.get("//entry:author", {entry: entryNs});
  var content = entry.get("//entry:content", {entry: entryNs});
  var updated = entry.get("//entry:updated", {entry: entryNs});
  var published = entry.get("//entry:published", {entry: entryNs});
  var parentFullid = entry.get("//entry:parent_fullid", {entry: entryNs});
  var parentSimpleid = entry.get("//entry:parent_simpleid", {entry: entryNs});
  var inReplyTo = entry.get("//entry:in-reply-to", {entry: entryNs});
  
  jsonItem = {
    id : id ? id.value() : null,
    author : author ? author.text() : null,
    content : content ? content.text() : null,
    updated : updated ? updated.text() : null,
    published : published ? published.text() : null,
    parent_fullid : parentFullid ? parentFullid.text() : null,
    parent_simpleid : parentSimpleid ? parentSimpleid.text() : null,
    in_reply_to : inReplyTo ? inReplyTo.attr('ref').value() : null
  };
  
  return jsonItem;
}

exports.postsToJSON = function(reply) {
  var items = xml.parseXmlString(reply.toString()).find('//query:item', {query: contentNs});
  var jsonItems = [];
  items.forEach(function(e){
    jsonItems.push(postToJson(e));
  });
  return jsonItems;
}