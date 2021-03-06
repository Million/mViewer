/*
 * Copyright (c) 2011 Imaginea Technologies Private Ltd.
 * Hyderabad, India
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
YUI({
    filter: 'raw'
}).use("yes-no-dialog", "alert-dialog", "io-base", "json-parse", "node-event-simulate", "node", "event-delegate", "stylize", "json-stringify", "utility", "event-key", "event-focus", "node-focusmanager", function (Y) {
    YUI.namespace('com.imaginea.mongoV');
    var MV = YUI.com.imaginea.mongoV;
    var sm = MV.StateManager;
    MV.treebleData = {};

    var showTabView = function (e) {
        var treeble;
        MV.toggleClass(e.currentTarget, Y.all("#collNames li"));
        sm.setCurrentColl(e.currentTarget.getContent());
        MV.mainBody.empty(true);
        function getQueryParameters() {
            var parsedQuery, query = Y.one('#queryBox').get("value");
            var limit = Y.one('#limit').get("value");
            var skip = Y.one('#skip').get("value");
            var fields = Y.all('#fields input');
            var index = 0;
            if (query === "") {
                query = "{}";
            }
            query = query.replace(/'/g, '"');
            var checkedFields = [];
            try {
                parsedQuery = Y.JSON.parse(query);
                for (index = 0; index < fields.size(); index++) {
                    var item = fields.item(index);
                    if (item.get("checked")) {
                        checkedFields.push(item.get("name"));
                    }
                }
                return ("&limit=[0]&skip=[1]&fields=[2]&query=[3]".format(limit, skip, checkedFields, query));
            } catch (error) {
                Y.log("Could not parse query. Reason: [0]".format(error), "error");
                MV.showAlertDialog("Failed:Could not parse query. [0]".format(error), MV.warnIcon);
            }
        }
        function defineDatasource() {
            MV.data = new YAHOO.util.XHRDataSource(MV.URLMap.getDocs(), {
                responseType: YAHOO.util.XHRDataSource.TYPE_JSON,
                responseSchema: {
                    resultsList: "response.result",
                    metaFields: {
                        startIndex: 'first_index',
                        recordsReturned: 'records_returned',
                        totalRecords: 'total_records'
                    }
                }
            });
        }
        function requestDocuments(param) {
            MV.data.sendRequest(param, {
                success: showDocuments,
                failure: function (request, responseObject) {
                    MV.showAlertDialog("Failed: Documents could not be loaded", MV.warnIcon);
                    Y.log("Documents could not be loaded. Response: [0]".format(responseObject.responseText), "error");
                },
                scope: tabView
            });
        }
        function executeQuery(e) {
            var queryParams = getQueryParameters();
            if (queryParams !== undefined) {
                requestDocuments(queryParams);
            }
        }
        function showQueryBox(ioId, responseObject) {
            Y.log("Preparing to show QueryBox", "info");
            try {
                Y.log("Parsing the JSON response to get the keys", "info");
                var parsedResponse = Y.JSON.parse(responseObject.responseText);
                var keys = parsedResponse.response.result;
                if (keys !== undefined) {
                    var queryForm = Y.one('#queryForm');
                    queryForm.addClass('form-cont');
                    queryForm.set("innerHTML", MV.getForm(keys));
                    // insert a ctrl + enter listener for query evaluation
                    Y.one("#queryBox").on("keyup", function (eventObject) {
                        if (eventObject.ctrlKey && eventObject.keyCode === 13) {
                            Y.one('#execQueryButton').simulate('click');
                        }
                    });

     
                    Y.log("QueryBox loaded", "info");
                    Y.on("click", executeQuery, "#execQueryButton");
                    defineDatasource();
                    requestDocuments(getQueryParameters());
                } else {
                    var error = parsedResponse.response.error;
                    Y.log("Could not get keys. Message: [0]".format(error.message), "error");
                    MV.showAlertDialog("Could not load the query Box! [0]".format(MV.errorCodeMap(error.code)), MV.warnIcon);
                }
            } catch (e) {
                Y.log("Could not parse the JSON response to get the keys", "error");
                Y.log("Response received: [0]".format(responseObject.resposeText), "error");
                MV.showAlertDialog("Cannot parse Response to get keys!", MV.warnIcon);
            }
        }
        var getKeyRequest = Y.io(MV.URLMap.documentKeys(), {
            method: "GET",
            on: {
                success: showQueryBox,
                failure: function (ioId, responseObject) {
                    MV.showAlertDialog("Unexpected Error: Could not load the query Box", MV.warnIcon);
                    Y.log("Could not send the request to get the keys in the collection. Response Status: [0]".format(responseObject.statusText), "error");
                }
            }
        });
        function fitToContent(maxHeight, text) {
            if (text) {
                var adjustedHeight = text.clientHeight;
                if (!maxHeight || maxHeight > adjustedHeight) {
                    adjustedHeight = Math.max(text.scrollHeight, adjustedHeight);
                    if (maxHeight) {
                        adjustedHeight = Math.min(maxHeight, adjustedHeight);
                    }
                    if (adjustedHeight > text.clientHeight) {
                        text.style.height = adjustedHeight + "px";
                    }
                }
            }
        }
        function loadAndSubscribe(treeble) {
            treeble.load();
            treeble.subscribe("rowMouseoverEvent", treeble.onEventHighlightRow);
            treeble.subscribe("rowMouseoutEvent", treeble.onEventUnhighlightRow);
        }

        function showDocuments(request, responseObject) {
            Y.log("Preparing to write on JSON tab", "info");
            writeOnJSONTab(responseObject.results);
            Y.log("Preparing the treeTable data", "info");
            var treebleData = MV.getTreebleDataforDocs(responseObject);
            treeble = MV.getTreeble(treebleData);
            loadAndSubscribe(treeble);
            Y.log("Tree table view loaded", "info");
            sm.publish(sm.events.queryFired);
        }

        var tabView = new YAHOO.widget.TabView();
        tabView.addTab(new YAHOO.widget.Tab({
            label: 'JSON',
            cacheData: true,
            active: true
        }));
        tabView.addTab(new YAHOO.widget.Tab({
            label: 'Tree Table',
            content: ' <div id="table"></div><div id="table-pagination"></div> '
        }));
        var actionMap = {
            save: "save",
            edit: "edit"
        };
        var idMap = {};
        function getButtonIndex(targetNode) {
            var btnID = targetNode.get("id");
            var match = btnID.match(/\d+/);
            return (parseInt(match[0], 10));
        }
        function toggleSaveEdit(targetNode, index, action) {
            var textArea = Y.one('#doc' + index).one("pre").one("textarea");
            var deleteBtn = Y.one('#delete' + index);
            var antiAction;
            var deleteBtnLabel;
            if (action === actionMap.save) {
                antiAction = actionMap.edit;
                textArea.addClass('disabled');
                textArea.setAttribute("disabled", "disabled");
                Y.on("click", editDoc, "#edit" + index);
                deleteBtnLabel = 'delete';
                deleteBtn.addClass('deletebtn');
                deleteBtn.removeClass('cancelbtn');
            } else {
                antiAction = actionMap.save;
                textArea.removeAttribute("disabled");
                textArea.removeClass('disabled');
                Y.on("click", saveDoc, "#save" + index);
                deleteBtnLabel = 'cancel';
                deleteBtn.removeClass('deletebtn');
                deleteBtn.addClass('cancelbtn');
            }
            deleteBtn.set('innerHTML', deleteBtnLabel);

            targetNode.set("innerHTML", antiAction);
            targetNode.removeClass(action + 'btn');
            targetNode.addClass(antiAction + 'btn');
            targetNode.set("id", antiAction + index);
            targetNode.focus();
            
        }
        function parseUpdateDocResponse(ioId, responseObject) {
            var parsedResponse = Y.JSON.parse(responseObject.responseText);
            response = parsedResponse.response.result;
            if (response !== undefined) {
                MV.showAlertDialog("Document updated", MV.infoIcon);
                Y.log("Document update to [0]".format(response), "info");
                Y.one("#" + Y.one("#currentColl").get("value").replace(/ /g, '_')).simulate("click");
            } else {
                var error = parsedResponse.response.error;
                MV.showAlertDialog("Could not update Document! [0]".format(MV.errorCodeMap[error.code]), MV.warnIcon, function () {
                    Y.one("#" + Y.one("#currentColl").get("value").replace(/ /g, '_')).simulate("click");
                });
                Y.log("Could not update Document! [0]".format(MV.errorCodeMap[error.code]), "error");
            }
        }
        function sendUpdateDocRequest(doc, id) {
            var updateDocumentRequest = Y.io(MV.URLMap.updateDoc(), {
                method: "POST",
                data: "_id=" + id + "&keys=" + doc,
                on: {
                    success: parseUpdateDocResponse,
                    failure: function (ioId, responseObject) {
                        MV.showAlertDialog("Unexpected Error: Could not update the document. Check if app server is running", MV.warnIcon);
                        Y.log("Could not send the request to update the document. Response Status: [0]".format(responseObject.statusText), "error");
                    }
                }
            });
        }
        function allKeysSelected() {
            var fields = Y.all('#fields input');
            var index;
            for (index = 0; index < fields.size(); index++) {
                var item = fields.item(index);
                if (!item.get("checked")) {
                    return false;
                }
            }
            return true;
        }
        function selectAllKeys() {
            var fields = Y.all('#fields input');
            var index;
            for (index = 0; index < fields.size(); index++) {
                var item = fields.item(index);
                item.set("checked", "true");
            }
            executeQuery();
            this.hide();
        }
        function deleteDoc(eventObject) {
            var btnIndex;
            var sendDeleteDocRequest = function () {
                var targetNode = eventObject.currentTarget;
                var index = getButtonIndex(targetNode);
                var doc = Y.one('#doc' + index).one("pre").one("textarea").get("value");
                parsedDoc = Y.JSON.parse(doc);
                var id = parsedDoc._id;
                var request = Y.io(MV.URLMap.deleteDoc(),
                                   // configuration for dropping the document
                                   {
                                       method: "POST",
                                       data: "_id=" + id,
                                       on: {
                                           success: function (ioId, responseObj) {
                                               var parsedResponse = Y.JSON.parse(responseObj.responseText);
                                               response = parsedResponse.response.result;
                                               if (response !== undefined) {
                                                   MV.showAlertDialog("Document deleted", MV.infoIcon);
                                                   Y.log("Document with _id= [0] deleted. Response: [1]".format(id, response), "info");
                                                   Y.one("#" + Y.one("#currentColl").get("value").replace(/ /g, '_')).simulate("click");
                                               } else {
                                                   var error = parsedResponse.response.error;
                                                   MV.showAlertDialog("Could not delete the document with _id [0]. [1]".format(id, MV.errorCodeMap[error.code]), MV.warnIcon);
                                                   Y.log("Could not delete the document with _id =  [0], Error message: [1], Error Code: [2]".format(id, error.message, error.code), "error");
                                               }
                                           },
                                           failure: function (ioId, responseObj) {
                                               Y.log("Could not delete the document .Status text: ".format(Y.one("#currentColl").get("value"), responseObj.statusText), "error");
                                               MV.showAlertDialog("Could not drop the document! Please check if your app server is running and try again. Status Text: [1]".format(responseObj.statusText), MV.warnIcon);
                                           }
                                       }
                                   });
                this.hide();
            };
            if (eventObject.currentTarget.hasClass('deletebtn')) {
                MV.showYesNoDialog("Do you really want to drop the document ?", sendDeleteDocRequest, function () {
                    this.hide();
                });
            } else {
                //get the sibling save/edit btn and toggle using that
                btnIndex = getButtonIndex(eventObject.currentTarget);
                toggleSaveEdit(Y.one('#delete'+btnIndex).get('parentNode').one('button'), btnIndex, actionMap.save);
            }
        }
        function saveDoc(eventObject) {
            var parsedDoc;
            var targetNode = eventObject.currentTarget;
            var index = getButtonIndex(targetNode);
            toggleSaveEdit(targetNode, index, actionMap.save);
            var doc = Y.one('#doc' + index).one("pre").one("textarea").get("value");
            doc = doc.replace(/'/g, '"');
            try {
                parsedDoc = Y.JSON.parse(doc);
            } catch (e) {
                MV.showAlertDialog("The document entered is not in the correct JSON format");
            }
            sendUpdateDocRequest(Y.JSON.stringify(parsedDoc), idMap.index);
        }
        function editDoc(eventObject) {
            if (!allKeysSelected()) {
                MV.showYesNoDialog("To edit a document you need check all keys in query box. Click YES to do so, NO to cancel", selectAllKeys, function () {
                    this.hide();
                });
            } else {
                var targetNode = eventObject.currentTarget;
                var index = getButtonIndex(targetNode);
                toggleSaveEdit(targetNode, index, actionMap.edit);
                var docNode = Y.one('#doc' + index).one("pre").one("textarea");
                docNode.focus();
                var doc = docNode.get("value");
                parsedDoc = Y.JSON.parse(doc);
                idMap.index = parsedDoc._id;
            }
        }
        function writeOnJSONTab(response) {
            var jsonView = "<div class='buffer jsonBuffer navigable navigateTable' id='jsonBuffer'>";
            var i;
            var trTemplate = ["<tr>",
                              "  <td id='doc[0]'>",
                              "      <pre> <textarea id='ta[1]' class='disabled non-navigable' disabled='disabled' cols='75'>[2]</textarea></pre>",
                              "  </td>",
                              "  <td>",
                              "   <button id='edit[3]'class='btn editbtn non-navigable'>edit</button>",
                              "   <br/>",
                              "   <button id='delete[4]'class='btn deletebtn non-navigable'>delete</button>",
                              "  </td>",
                              "</tr>"].join('\n');
            jsonView += "<table class='jsonTable'><tbody>";
            
            for (i = 0; i < response.length; i++) {
                jsonView += trTemplate.format(i, i, Y.JSON.stringify(response[i], null, 4),i, i);
            }
            if (i === 0) {
                jsonView = jsonView + "No documents to be displayed";
            }
            jsonView = jsonView + "</tbody></table></div>";
            tabView.getTab(0).setAttributes({
                content: jsonView
            }, false);
            for (i = 0; i < response.length; i++) {
                Y.on("click", editDoc, "#edit" + i);
                Y.on("click", deleteDoc, "#delete" + i);
            }
            for (i = 0; i < response.length; i++) {
                fitToContent(500, document.getElementById("ta" + i));
            }
            var trSelectionClass = 'selected';
            // add click listener to select and deselect rows.
            Y.all('.jsonTable tr').on("click", function (eventObject) {
                var currentTR = eventObject.currentTarget;
                var alreadySelected = currentTR.hasClass(trSelectionClass);

                Y.all('.jsonTable tr').each(function(item) {
                    item.removeClass(trSelectionClass);
                });

                if (!alreadySelected) {
                    currentTR.addClass(trSelectionClass);
                    var editBtn = currentTR.one('button.editbtn');
                    if (editBtn) {
                        editBtn.focus();
                    }
                }
            });
            Y.on('blur', function(eventObject) {
                var resetAll = true;
                // FIXME ugly hack for avoiding blur when scroll happens
                if (sm.isNavigationSideEffect()) {
                    resetAll = false;
                }
                if (resetAll) {
                    Y.all('tr.selected').each(function(item) {
                        item.removeClass(trSelectionClass);
                    });
                }
            }, 'div.jsonBuffer');

            Y.on('keyup', function(eventObject) {
                var firstItem;
                // escape edit mode
                if (eventObject.keyCode === 27) {
                    Y.all("button.savebtn").each(function(item) {
                        toggleSaveEdit(item, getButtonIndex(item), actionMap.save);
                        if (!(firstItem)) {
                            firstItem = item;
                        }
                    });
                }
            }, 'div.jsonBuffer');
            Y.log("The documents written on the JSON tab", "debug");
        }
        MV.header.set("innerHTML", "Contents of " + Y.one("#currentColl").get("value"));
        tabView.appendTo(MV.mainBody.get('id'));
    };
    Y.delegate("click", showTabView, "#collNames", "li");
});