'use strict';

/**
 * Mixin for form capabilities (some sort of data-binding)
 *
 * init:
 *
 * mixins: [
 *    mixinForm({
 *      // required
 *      viewModelName: 'ModelName', // name of model
 *      // optional
 *      name: 'formName', // form name (default "form")
 *      dataPropertyName: 'data', // initial data (object or name of corresponding property name (this.props['name']) (default "data")
 *      labelErrorClassName: '', // if empty, uses "{name}-label-error"
 *      labelSuccessClassName: '', // if empty, uses "{name}-label-success"
 *      inputErrorClassName: '', // if empty, uses "{name}-input-error"
 *      inputSuccessClassName: '' // if empty, uses "{name}-input-success"
 *    }, models) // {ModelName: Backbone.Model() }
 * ]
 *
 * using:
 *
 * <label className={this.formName().labelClassName('name')}>Title Name:</label>
 *
 * <Input type="text"
 *      value={this.formName().value('name')}
 *      onChange={this.formName().onChange('name')}
 *      className={this.formName().classNameInput('name')} />
 *
 * <ImageUploader
 *     value={this.formName().value('icons[name=ipad152x152].uri')}
 *     onChange={this.formName().onChange('icons[name=ipad152x152].uri')} />
 *
 * or simple syntax
 *
 * <Input type="text" {...this.formName().attribute('name)} />
 *
 * <ImageUploader {...this.formName().attribute('icons[name=ipad152x152].uri')} />
 *
 * labelClassName('attribute name') - returns css class name for validated label
 * inputClassName('attribute name') - returns css class name for validated input
 * model - return model
 * value('attribute name') - returns value
 * onChange('attribute name') - returns onChange callback
 * errors() - returns list of errors for whole model
 * isValid() - checks model is valid
 * validate() - runs model validation
 * attribute('attribute name') - uses spread attributes
 *
 */

var _ = require('lodash');

/**
 * 'icons[name=ipad152x152].uri'
 * to
 * ['icons', {'name': 'ipad152x152'}, 'uri'}
 */

var cachedNestedAttributes = {};

var getNestedAttribute = function (attribute) {

    if (!cachedNestedAttributes[attribute]) {
        var list = [];
        var chains = attribute.split('.');

        _.each(chains, function (chain) {

            if (chain.indexOf('[') !== -1) {
                // collection
                var subKeys = chain.split('[');

                var conditions = {};
                _.each(subKeys.slice(1), function (subKey) {
                    subKey = subKey.substr(0, subKey.length - 1);
                    var pos = subKey.indexOf('=');
                    if (pos > 0) {
                        conditions[subKey.substr(0, pos)] = subKey.substring(pos + 1);
                    }
                });
                list.push(subKeys[0]);
                list.push(conditions);

            } else {
                // object
                list.push(chain);
            }

        });
        cachedNestedAttributes[attribute] = list;
    }
    return JSON.parse(JSON.stringify(cachedNestedAttributes[attribute]));
};

/**
 *
 */

var getPath = function (list) {
    return _.reduce(list, function (result, attr) {
        return result + (_.isNumber(attr) ? ('[' + attr + ']') : ('.' + attr));
    });
};

var getParamsByAttribute = function (modelData, attribute, value) {

    var data = modelData;
    var listOfAttributes = [];
    var existedAttribute = '';

    _.each(getNestedAttribute(attribute), function (chain, index, list) {
        if (_.isString(chain)) {
            if (_.isUndefined(data[chain])) {
                data[chain] = _.isUndefined(list[index + 1]) ? value : (_.isString(list[index + 1]) ? {} : []);
                existedAttribute = existedAttribute || _.clone(listOfAttributes);
            }
            data = data[chain];
            listOfAttributes.push(chain);
        } else {
            if (_.isArray(data)) {
                var number;
                for (var i = 0; i < data.length; i++) {
                    if (_.find([data[i]], chain)) {
                        data = data[i];
                        number = i;
                        break;
                    }
                }
                if (_.isUndefined(number)) {
                    data.push(chain);
                    number = data.length - 1;
                    data = data[number];
                    existedAttribute = existedAttribute || _.clone(listOfAttributes);
                }
                listOfAttributes.push(number);
            }
        }
    });
    existedAttribute = existedAttribute || _.clone(listOfAttributes);

    var normalizedAttribute = getPath(listOfAttributes);
    var normalizedExistedAttribute = getPath(existedAttribute);

    var dataForInsert;
    if (normalizedExistedAttribute === normalizedAttribute) {
        dataForInsert = value;
    } else {
        dataForInsert = modelData;
        _.each(existedAttribute, function (attr) {
            if (!_.isUndefined(dataForInsert[attr])) {
                dataForInsert = dataForInsert[attr];
            }
        });
    }

    return [data, normalizedAttribute, normalizedExistedAttribute, dataForInsert];
};

module.exports = function factoryFormMixin(params, models) {

    var name = params.name || 'form';
    var viewModelName = params['viewModelName'];
    var dataPropertyName = params['dataPropertyName'] || 'data';

    if (!viewModelName || !models[viewModelName]) {
        return {};
    }

    var viewModelProp = 'viewModel' + name;

    var handleValidated = function (isValid, model, errors) {
        var state = {};
        state[name + '-errors'] = errors;
        _.each(_.keys(model.attributes), function (attribute) {
            state[name + '-error-' + attribute] = errors[attribute];
        });
        this.setState(state);
    };

    var setInitData = function (initData, props) {
        props = props || this.props;
        if (_.isString(initData)) {
            if (props[initData]) {
                this[viewModelProp].set(props[initData]);
            }
        } else {
            this[viewModelProp].set(initData);
        }
    };

    var mixin = {

        componentWillMount: function () {
            this[viewModelProp] = new models[viewModelName]();
            setInitData.call(this, dataPropertyName);
            this[viewModelProp].on('validated', handleValidated, this);
        },

        componentWillUpdate: function (nextProps) {
            if (_.isString(dataPropertyName) && nextProps[dataPropertyName] && !_.isEqual(nextProps[dataPropertyName], this.props[dataPropertyName])) {
                setInitData.call(this, dataPropertyName, nextProps);
            }
        },

        componentWillUnmount: function () {
            this[viewModelProp].off('validated', handleValidated, this);
        }

    };

    mixin[name] = function () {

        var that = this;

        var funcValue = function (attribute) {
            return getParamsByAttribute(that[viewModelProp].toJSON(), attribute)[0];
        };

        var funcValidate = function (attrs) {
            var errors = that[viewModelProp].preValidate(attrs);
            var state = {};
            var stateErrors = _.cloneDeep(that.state[name + '-errors']) || {};
            _.each(_.keys(attrs), function (attribute) {
                var error = errors && errors[attribute];
                state[name + '-error-' + attribute] = error;
                stateErrors[attribute] = error ? error : undefined;
            });
            state[name + '-errors'] = stateErrors;
            !_.isEmpty(state) && that.setState(state);
        };

        var funcOnChange = function (attribute) {
            var isComplexAttribute = attribute.indexOf('.') !== -1 || attribute.indexOf('[') !== 1;
            return function (event) {
                event.stopPropagation && event.stopPropagation();
                var value = event.target ? event.target.value : event;

                var params = getParamsByAttribute(this[viewModelProp].toJSON(), attribute, value);

                var data = {};
                // if we want update a whole object
                if (params[2].substr(-1) === ']') {
                    _.each(params[3], function (value, key) {
                        data[params[2] + '.' + key] = value;
                    });
                } else {
                    // if we want update just one field in an object
                    data[params[2]] = params[3];
                }

                this[viewModelProp].set(data, {forceUpdate: true});
                if (isComplexAttribute) {
                    this[viewModelProp].trigger('change', this[viewModelProp]);
                }

                _.defer(function () {
                    funcValidate(data);
                });

            }.bind(that);
        };

        var funcClassNameLabel = function (attribute, emptyByDefault) {
            var stateName = name + '-error-' + attribute;
            var className = (_.isNull(that.state) || _.isUndefined(that.state[name + '-errors'])) && emptyByDefault ?
                '' :
                (that.state && that.state[stateName] ?
                params['labelErrorClassName'] || (name + '-label-error') :
                params['labelSuccessClassName'] || (name + '-label-success'));
            return _.isFunction(that.className) ? that.className(className) : className;
        };

        var funcClassNameInput = function (attribute, emptyByDefault) {
            var stateName = name + '-error-' + attribute;
            var className = (_.isNull(that.state) || _.isUndefined(that.state[name + '-errors'])) && emptyByDefault ?
                '' :
                (that.state && that.state[stateName] ?
                params['inputErrorClassName'] || (name + '-input-error') :
                params['inputSuccessClassName'] || (name + '-input-success'));
            return _.isFunction(that.className) ? that.className(className) : className;
        };

        return {

            value: funcValue,
            onChange: funcOnChange,
            labelClassName: funcClassNameLabel,
            inputClassName: funcClassNameInput,
            model: that[viewModelProp],
            validate: funcValidate,

            errors: function (attribute) {
                var errors = that.state[name + '-errors'] || {};
                return attribute ? errors[attribute] : errors;
            },

            isValid: function () {
                return _.isEmpty(that[viewModelProp].preValidate(that[viewModelProp].attributes));
            },

            toJSON: function () {
                return that[viewModelProp].toJSON();
            },

            attribute: function (attribute) {
                return {
                    value: funcValue(attribute),
                    onChange: funcOnChange(attribute),
                    className: funcClassNameInput(attribute, true)
                };
            }

        };

    };

    return mixin;

};
