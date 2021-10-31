$(document).ready(function() {
    var $table = $('#table');
    var $buttonDelete = $('#buttonDelete');
    var $buttonModifierCate = $('#buttonModifierCate');
    var $buttonRead = $('#read');

    $buttonDelete.click(function() {
        var array = $table.bootstrapTable('getSelections');

        var toDelete = [];
        for (var i = 0; i < array.length; i++) {
            toDelete.push(array[i]._id);
        }
        $.post('/movies/del', {data: toDelete}, function(status) {
            $table.bootstrapTable('refresh');
        });
    });

    $buttonModifierCate.click(function() {
        alert('$buttonModifierCate: ' + JSON.stringify($table.bootstrapTable('getSelections')));
    });

    $buttonRead.click(function() {
        $.get('/scan', function(data, res) {
            const {status, error} = data;
            if (status === 'success') {
                setTimeout(() => {
                    $table.bootstrapTable('refresh');
                }, 100);
            } else {
                alert(error);
            }
        });
    });
});

/**
 * 表格转换
 * @param {*} value
 * @param {*} row
 * @param {*} index
 */
function dateFormat(value, row, index) {
    return new Date(value).toISOString().replace('T', ' ').substr(0, 19);
}

function status(value, row, index) {
    if (value == 'finished') {
        return '<span class=\'text-success\'>' + value + '</span>';
    }
    return value;
}
