import { Component, OnInit } from '@angular/core';
import { customizeUtil, MindMapMain } from 'mind-map';

const HIERARCHY_RULES = {
  ROOT: {
    name: 'XX汽车有限公司',
    backgroundColor: '#7EC6E1',
    getChildren: () => [
      HIERARCHY_RULES.SALES_MANAGER,
      HIERARCHY_RULES.SHOW_ROOM,
      HIERARCHY_RULES.SALES_TEAM
    ]
  },
  SALES_MANAGER: {
    name: '销售经理',
    color: '#fff',
    backgroundColor: '#616161',
    getChildren: () => [
      HIERARCHY_RULES.SHOW_ROOM,
      HIERARCHY_RULES.SALES_TEAM
    ]
  },
  SHOW_ROOM: {
    name: '展厅',
    color: '#fff',
    backgroundColor: '#989898',
    getChildren: () => [
      HIERARCHY_RULES.SALES_TEAM
    ]
  },
  SALES_TEAM: {
    name: '销售小组',
    color: '#fff',
    backgroundColor: '#C6C6C6',
    getChildren: () => []
  }
};

const option = {
  container: 'jsmind_container',
  theme: 'normal',
  editable: true,
  depth: 4,
  hierarchyRule: HIERARCHY_RULES,
  enableDraggable: true,
};

const mind = {
  "format": "nodeTree",
  "data": {
    "id": 43,
    "topic": "xx车行",
    "selectedType": false,
    "backgroundColor": "#7EC6E1",
    "children": [
      {
        "id": 80,
        "color": "#fff",
        "topic": "show room",
        "direction": "right",
        "selectedType": "销售经理",
        "backgroundColor": "#616161",
        "children": []
      },
      {
        "id": 44,
        "color": "#fff",
        "topic": "销售经理",
        "direction": "right",
        "selectedType": "销售经理",
        "backgroundColor": "#616161",
        "children": [
          {
            "id": 46,
            "color": "#fff",
            "topic": "展厅经理",
            "direction": "right",
            "selectedType": "展厅",
            "backgroundColor": "#989898",
            "children": [
              {
                "id": 49,
                "color": "#fff",
                "topic": "销售小组C",
                "direction": "right",
                "selectedType": "销售小组",
                "backgroundColor": "#C6C6C6",
                "children": []
              },
              {
                "id": 51,
                "color": "#fff",
                "topic": "AMG销售",
                "direction": "right",
                "selectedType": "销售小组",
                "backgroundColor": "#C6C6C6",
                "children": []
              },
              {
                "id": 47,
                "color": "#fff",
                "topic": "销售小组A",
                "direction": "right",
                "selectedType": "销售小组",
                "backgroundColor": "#C6C6C6",
                "children": []
              },
              {
                "id": 48,
                "color": "#fff",
                "topic": "销售小组B",
                "direction": "right",
                "selectedType": "销售小组",
                "backgroundColor": "#C6C6C6",
                "children": []
              },
              {
                "id": 50,
                "color": "#fff",
                "topic": "销售小组D",
                "direction": "right",
                "selectedType": "销售小组",
                "backgroundColor": "#C6C6C6",
                "children": []
              }
            ]
          }
        ]
      },
      {
        "id": 45,
        "color": "#fff",
        "topic": "Smart经理",
        "direction": "right",
        "selectedType": "销售经理",
        "backgroundColor": "#616161",
        "children": []
      }
    ]
  }
};
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'app';

  mindMap;

  ngOnInit() {
    this.mindMap = MindMapMain.show(option, mind);
  }

  removeNode() {
    const selectedNode = this.mindMap.getSelectedNode();
    const selectedId = selectedNode && selectedNode.id;

    if (!selectedId) {
      return;
    }
    this.mindMap.removeNode(selectedId);
  }

  addNode() {
    const selectedNode = this.mindMap.getSelectedNode();
    if (!selectedNode) {
      return;
    }

    const nodeId = customizeUtil.uuid.newid();
    this.mindMap.addNode(selectedNode, nodeId);
  }

  getMindMapData() {
    const data = this.mindMap.getData().data;
    console.log('data: ', data);
  }
}
