React Validator via Backbone Models
===================================

Form binding and validation with Backbone Models.

Installation
------------

React-Validator-Mixin is available as an npm package.

    npm install react-validator-mixin --save

Usage
-----

init

```javascript
mixins: [
   mixinFormValidator({
     // required
     viewModelName: 'ModelName', // name of model
     // optional
     name: 'formName', // form name (default "form")
     dataPropertyName: 'data', // initial data (object or name of corresponding property name (this.props['name']
     labelErrorClassName: '', // if empty, uses "{name}-label-error"
     labelSuccessClassName: '', // if empty, uses "{name}-label-success"
     inputErrorClassName: '', // if empty, uses "{name}-input-error"
     inputSuccessClassName: '' // if empty, uses "{name}-input-success"
   }, models) // {ModelName: Backbone.Model() }
]
```

using:

```
<label className={this.formName().labelClassName('name')}>Title Name:</label>
<Input type="text"
     value={this.formName().value('name')}
     onChange={this.formName().onChange('name')}
     className={this.formName().classNameInput('name')} />
<ImageUploader
    value={this.formName().value('icons[name=ipad152x152].uri')}
    onChange={this.formName().onChange('icons[name=ipad152x152].uri')} />
```

or simple syntax

```
<Input type="text" {...this.formName().attribute('name)} />
<ImageUploader {...this.formName().attribute('icons[name=ipad152x152].uri')} />
```

functions

```
this.formName().
    labelClassName('attribute name') - returns css class name for validated label
    inputClassName('attribute name') - returns css class name for validated input
    model - return model
    value('attribute name') - returns value
    onChange('attribute name') - returns onChange callback
    errors() - returns list of errors for whole model
    isValid() - checks model is valid
    validate() - runs model validation
    attribute('attribute name') - uses spread attributes
```
